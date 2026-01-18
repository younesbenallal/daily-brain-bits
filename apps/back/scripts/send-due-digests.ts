import { billingSubscriptions, db, noteDigests, reviewStates } from "@daily-brain-bits/db";
import { and, desc, eq, inArray } from "drizzle-orm";
import { prepareDigestItems } from "../utils/digest-generation";
import { type DigestFrequency, isDigestDue, resolveEffectiveFrequency } from "../utils/digest-schedule";
import { upsertDigestWithItems } from "../utils/digest-storage";
import { env } from "../utils/env";
import { buildDigestEmail, loadDigestSnapshot } from "../utils/note-digest-email";
import { sendResendEmail } from "../utils/resend";

const DEFAULT_NOTES_PER_DIGEST = 5;
const DEFAULT_FREQUENCY: DigestFrequency = "daily";

const DRY_RUN = env.DIGEST_EMAIL_DRY_RUN;
const FROM_ADDRESS = env.RESEND_FROM;
const REPLY_TO = env.RESEND_REPLY_TO;
const FRONTEND_URL = env.FRONTEND_URL;

type UserRow = {
	id: string;
	email: string | null;
	emailVerified: boolean;
	name: string | null;
};

const now = new Date();

function buildIdempotencyKey(digestId: number): string {
	return `note-digest-${digestId}`;
}

async function main() {
	const users = await db.query.user.findMany({
		columns: { id: true, email: true, emailVerified: true, name: true },
	});
	const settingsRows = await db.query.userSettings.findMany({
		columns: { userId: true, emailFrequency: true, notesPerDigest: true },
	});
	const proSubscriptions = await db.query.billingSubscriptions.findMany({
		where: inArray(billingSubscriptions.status, ["active", "trialing"]),
		columns: { userId: true },
	});
	const sentDigests = await db.query.noteDigests.findMany({
		where: eq(noteDigests.status, "sent"),
		columns: { userId: true, sentAt: true, createdAt: true },
		orderBy: [desc(noteDigests.sentAt), desc(noteDigests.createdAt)],
	});

	console.info("[send-due-digests] found %d users", users.length);
	console.info("[send-due-digests] found %d settings", settingsRows.length);
	console.info("[send-due-digests] found %d pro subscriptions", proSubscriptions.length);
	console.info("[send-due-digests] found %d sent digests", sentDigests.length);

	const settingsMap = new Map(settingsRows.map((row) => [row.userId, row]));
	const proUsers = new Set(proSubscriptions.map((row) => row.userId));
	const lastSentMap = new Map<string, Date>();

	for (const digest of sentDigests) {
		if (!digest.sentAt) {
			continue;
		}
		if (!lastSentMap.has(digest.userId)) {
			lastSentMap.set(digest.userId, digest.sentAt);
		}
	}

	const candidates = users.filter((candidate) => candidate.email && candidate.emailVerified) as UserRow[];

	for (const candidate of candidates) {
		const settings = settingsMap.get(candidate.id);
		const requestedFrequency = settings?.emailFrequency ?? DEFAULT_FREQUENCY;
		const effectiveFrequency = resolveEffectiveFrequency({
			requested: requestedFrequency,
			isPro: proUsers.has(candidate.id),
		});
		const lastSentAt = lastSentMap.get(candidate.id) ?? null;

		if (!isDigestDue({ now, lastSentAt, frequency: effectiveFrequency, userId: candidate.id })) {
			continue;
		}

		const pendingDigest = await db.query.noteDigests.findFirst({
			where: and(eq(noteDigests.userId, candidate.id), inArray(noteDigests.status, ["scheduled", "failed"])),
			columns: { id: true },
			orderBy: [desc(noteDigests.createdAt)],
		});

		let digestId = pendingDigest?.id ?? null;

		if (!digestId) {
			const plan = await prepareDigestItems({
				userId: candidate.id,
				notesPerDigest: settings?.notesPerDigest ?? DEFAULT_NOTES_PER_DIGEST,
				now,
			});

			if (!plan.hasDocuments || plan.itemCount === 0) {
				await upsertDigestWithItems({
					userId: candidate.id,
					items: [],
					status: "skipped",
					scheduledFor: now,
					sentAt: null,
					payloadJson: {
						reason: plan.hasDocuments ? "empty_selection" : "no_documents",
					},
				});
				continue;
			}

			digestId = await upsertDigestWithItems({
				userId: candidate.id,
				items: plan.items,
				status: "scheduled",
				scheduledFor: now,
				sentAt: null,
			});
		}

		if (!digestId) {
			continue;
		}

		const snapshot = await loadDigestSnapshot({ userId: candidate.id, digestId });
		if (!snapshot || snapshot.items.length === 0) {
			await upsertDigestWithItems({
				userId: candidate.id,
				digestId,
				items: null,
				status: "skipped",
				scheduledFor: now,
				sentAt: null,
				payloadJson: { reason: "empty_snapshot" },
			});
			continue;
		}

		const email = buildDigestEmail({
			frequency: effectiveFrequency,
			userName: candidate.name,
			frontendUrl: FRONTEND_URL,
			digest: snapshot,
		});

		const idempotencyKey = buildIdempotencyKey(digestId);
		const { id: resendEmailId, error } = await sendResendEmail({
			payload: {
				from: FROM_ADDRESS,
				to: candidate.email!,
				replyTo: REPLY_TO,
				subject: email.subject,
				html: email.html,
				text: email.text,
				tags: [
					{ name: "category", value: "note_digest" },
					{ name: "frequency", value: effectiveFrequency },
				],
			},
			idempotencyKey,
			dryRun: DRY_RUN,
		});

		if (error) {
			await upsertDigestWithItems({
				userId: candidate.id,
				digestId,
				items: null,
				status: "failed",
				scheduledFor: now,
				sentAt: null,
				errorJson: error,
				payloadJson: { idempotencyKey, provider: "resend" },
			});
			continue;
		}

		await db
			.insert(reviewStates)
			.values(
				snapshot.items.map((item) => ({
					documentId: item.documentId,
					userId: candidate.id,
					status: "new" as const,
					lastSentAt: now,
					updatedAt: now,
				})),
			)
			.onConflictDoUpdate({
				target: [reviewStates.documentId],
				set: {
					lastSentAt: now,
					updatedAt: now,
				},
			});

		await upsertDigestWithItems({
			userId: candidate.id,
			digestId,
			items: null,
			status: "sent",
			scheduledFor: now,
			sentAt: now,
			payloadJson: {
				idempotencyKey,
				resendEmailId,
				provider: "resend",
			},
			errorJson: null,
		});
	}
}

main().catch((error) => {
	console.error("[send-due-digests] failed", error);
	process.exit(1);
});
