import { db, noteDigests } from "@daily-brain-bits/db";
import { desc, eq } from "drizzle-orm";
import { getStartOfLocalDay, isSameLocalDay } from "../domains/digest/schedule";
import { env } from "../infra/env";
import { prepareDigestItems } from "../utils/digest-generation";
import { upsertDigestWithItems } from "../utils/digest-storage";

const DEFAULT_NOTES_PER_DIGEST = 5;

void env;

export async function runGenerateDailyDigests() {
	const now = new Date();
	const users = await db.query.user.findMany({
		columns: { id: true },
	});
	const settingsRows = await db.query.userSettings.findMany({
		columns: { userId: true, notesPerDigest: true, timezone: true },
	});
	const settingsMap = new Map(settingsRows.map((row) => [row.userId, row]));

	console.info("[generate-daily-digests] found %d users", users.length);

	for (const candidate of users) {
		const latestDigest = await db.query.noteDigests.findFirst({
			where: eq(noteDigests.userId, candidate.id),
			columns: { id: true, scheduledFor: true, createdAt: true },
			orderBy: [desc(noteDigests.createdAt)],
		});

		const timezone = settingsMap.get(candidate.id)?.timezone ?? "UTC";
		const digestDate = latestDigest?.scheduledFor ?? latestDigest?.createdAt ?? null;
		if (digestDate && isSameLocalDay(now, digestDate, timezone)) {
			continue;
		}

		const notesPerDigest = settingsMap.get(candidate.id)?.notesPerDigest ?? DEFAULT_NOTES_PER_DIGEST;
		const scheduledFor = getStartOfLocalDay(now, timezone);
		const plan = await prepareDigestItems({
			userId: candidate.id,
			notesPerDigest,
			now,
		});

		if (!plan.hasDocuments || plan.itemCount === 0) {
			await upsertDigestWithItems({
				userId: candidate.id,
				items: [],
				status: "skipped",
				scheduledFor,
				sentAt: null,
				payloadJson: {
					reason: plan.hasDocuments ? "empty_selection" : "no_documents",
					createdBy: "daily_cron",
				},
			});
			continue;
		}

		await upsertDigestWithItems({
			userId: candidate.id,
			items: plan.items,
			status: "scheduled",
			scheduledFor,
			sentAt: null,
			payloadJson: { createdBy: "daily_cron" },
		});
	}
}

if (import.meta.main) {
	runGenerateDailyDigests().catch((error) => {
		console.error("[generate-daily-digests] failed", error);
		process.exit(1);
	});
}
