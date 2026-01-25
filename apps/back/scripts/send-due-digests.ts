import { db, noteDigests, reviewStates } from "@daily-brain-bits/db";
import { and, desc, eq, inArray } from "drizzle-orm";
import {
	type DigestFrequency,
	isDigestDueWithTimezone,
	isSameLocalDay,
	resolveEffectiveFrequency,
} from "../utils/digest-schedule";
import { upsertDigestWithItems } from "../utils/digest-storage";
import { getProUsers } from "../utils/entitlements";
import { env } from "../utils/env";
import { buildDigestEmail, loadDigestSnapshot } from "../utils/note-digest-email";
import { sendResendEmail } from "../utils/resend";

const DEFAULT_FREQUENCY: DigestFrequency = "daily";

const DRY_RUN = env.DIGEST_EMAIL_DRY_RUN;
const FROM_ADDRESS = env.RESEND_FROM;
const REPLY_TO = env.RESEND_REPLY_TO;
const FRONTEND_URL = env.FRONTEND_URL;

const now = new Date();

function buildIdempotencyKey(digestId: number): string {
	return `note-digest-${digestId}`;
}

export async function runSendDueDigests() {
	console.log("[send-due-digests] Starting digest email process...");

	const users = await db.query.user.findMany({
		columns: { id: true, email: true, emailVerified: true, name: true },
	});
	const settingsRows = await db.query.userSettings.findMany({
		columns: { userId: true, emailFrequency: true, timezone: true, preferredSendHour: true },
	});
	const proUsers = await getProUsers(users.map((user) => user.id));
	const sentDigests = await db.query.noteDigests.findMany({
		where: eq(noteDigests.status, "sent"),
		columns: { userId: true, sentAt: true, createdAt: true },
		orderBy: [desc(noteDigests.sentAt), desc(noteDigests.createdAt)],
	});

	console.info("[send-due-digests] found %d users", users.length);
	console.info("[send-due-digests] found %d settings", settingsRows.length);
	console.info("[send-due-digests] resolved %d pro users", proUsers.size);
	console.info("[send-due-digests] found %d sent digests", sentDigests.length);

	const settingsMap = new Map(settingsRows.map((row) => [row.userId, row]));
	const lastSentMap = new Map<string, Date>();

	for (const digest of sentDigests) {
		if (!digest.sentAt) {
			continue;
		}
		if (!lastSentMap.has(digest.userId)) {
			lastSentMap.set(digest.userId, digest.sentAt);
		}
	}

	const candidates = users.filter((candidate) => candidate.email && candidate.emailVerified);

	console.log(`[send-due-digests] Processing ${candidates.length} eligible users...`);

	for (const candidate of candidates) {
		console.log(`[send-due-digests] Checking user ${candidate.id} (${candidate.email})`);

		const settings = settingsMap.get(candidate.id);
		const requestedFrequency = settings?.emailFrequency ?? DEFAULT_FREQUENCY;
		const timezone = settings?.timezone ?? "UTC";
		const preferredSendHour = settings?.preferredSendHour ?? 8;
		const effectiveFrequency = resolveEffectiveFrequency({
			requested: requestedFrequency,
			isPro: proUsers.has(candidate.id),
		});
		const lastSentAt = lastSentMap.get(candidate.id) ?? null;

		if (!isDigestDueWithTimezone({ now, lastSentAt, frequency: effectiveFrequency, userId: candidate.id, timezone, preferredSendHour })) {
			console.log(
				`[send-due-digests] Skipping user ${candidate.id} - not due yet (freq: ${effectiveFrequency}, tz: ${timezone}, hour: ${preferredSendHour}, last sent: ${lastSentAt?.toISOString()})`,
			);
			continue;
		}

		const pendingDigest = await db.query.noteDigests.findFirst({
			where: and(eq(noteDigests.userId, candidate.id), inArray(noteDigests.status, ["scheduled", "failed"])),
			columns: { id: true, scheduledFor: true, createdAt: true },
			orderBy: [desc(noteDigests.createdAt)],
		});

		if (!pendingDigest?.id) {
			console.log(`[send-due-digests] Skipping user ${candidate.id} - no pending digest found`);
			continue;
		}

		const digestDate = pendingDigest.scheduledFor ?? pendingDigest.createdAt;
		if (!digestDate || !isSameLocalDay(now, digestDate, timezone)) {
			console.log(`[send-due-digests] Skipping user ${candidate.id} - digest not for today in ${timezone} (scheduled: ${digestDate?.toISOString()})`);
			continue;
		}

		console.log(`[send-due-digests] Processing digest ${pendingDigest.id} for user ${candidate.id}`);

		const digestId = pendingDigest.id;

		console.log(`[send-due-digests] Loading digest snapshot for user ${candidate.id}...`);
		const snapshot = await loadDigestSnapshot({ userId: candidate.id, digestId });
		if (!snapshot || snapshot.items.length === 0) {
			console.log(`[send-due-digests] Skipping user ${candidate.id} - empty digest (${snapshot?.items.length ?? 0} items)`);
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

		console.log(`[send-due-digests] Sending digest with ${snapshot.items.length} items to ${candidate.email}`);

		const email = buildDigestEmail({
			frequency: effectiveFrequency,
			userName: candidate.name,
			frontendUrl: FRONTEND_URL,
			digest: snapshot,
		});

		const idempotencyKey = process.env.FORCE_EMAIL === "true" ? `note-digest-${digestId}-${Date.now()}` : buildIdempotencyKey(digestId);
		console.log(`[send-due-digests] Sending email to ${candidate.email}${DRY_RUN ? " (DRY RUN)" : ""}...`);
		const { id: resendEmailId, error } = await sendResendEmail({
			payload: {
				from: FROM_ADDRESS,
				to: candidate.email,
				replyTo: REPLY_TO,
				subject: email.subject,
				text: email.text,
				react: email.react,
				tags: [
					{ name: "category", value: "note_digest" },
					{ name: "frequency", value: effectiveFrequency },
				],
			},
			idempotencyKey,
			dryRun: DRY_RUN,
		});

		if (error) {
			console.log(`[send-due-digests] Failed to send email to ${candidate.email}: ${JSON.stringify(error)}`);
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

		console.log(`[send-due-digests] Updating review states for ${snapshot.items.length} items...`);
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

		console.log(`[send-due-digests] Marking digest ${digestId} as sent`);
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

		console.log(`[send-due-digests] Successfully processed digest for user ${candidate.id}`);
	}

	console.log("[send-due-digests] Digest email process completed");
}

if (import.meta.main) {
	runSendDueDigests().catch((error) => {
		console.error("[send-due-digests] Process failed with error:", error);
		process.exit(1);
	});
}
