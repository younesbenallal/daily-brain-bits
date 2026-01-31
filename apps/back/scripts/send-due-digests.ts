import { DEFAULT_DIGEST_INTERVAL_DAYS, PLANS } from "@daily-brain-bits/core";
import { db, documents, integrationConnections, noteDigests, reviewStates, user, userSettings } from "@daily-brain-bits/db";
import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { getProUsers } from "../domains/billing/entitlements";
import { clampIntervalToLimits, isDigestDueWithTimezone, isSameLocalDay } from "../domains/digest/schedule";
import { sendResendEmail } from "../domains/email/resend";
import { env } from "../infra/env";
import { upsertDigestWithItems } from "../utils/digest-storage";
import { buildDigestEmail, loadDigestSnapshot } from "../utils/note-digest-email";

const DRY_RUN = env.DIGEST_EMAIL_DRY_RUN;
const FROM_ADDRESS = env.RESEND_FROM;
const REPLY_TO = env.RESEND_REPLY_TO;
const FRONTEND_URL = env.FRONTEND_URL;

function buildIdempotencyKey(digestId: number): string {
	return `note-digest-${digestId}`;
}

type RunSendDueDigestsOptions = {
	now?: Date;
	targetUserId?: string;
	/** Bypass schedule check if this is the user's first digest */
	skipScheduleForFirstDigest?: boolean;
};

export async function runSendDueDigests(options: RunSendDueDigestsOptions = {}) {
	const now = options.now ?? new Date();
	const targetUserId = options.targetUserId ?? null;
	const skipScheduleForFirstDigest = options.skipScheduleForFirstDigest ?? false;

	console.log("[send-due-digests] Starting digest email process...");

	const users = await db.query.user.findMany({
		where: targetUserId ? eq(user.id, targetUserId) : undefined,
		columns: { id: true, email: true, emailVerified: true, name: true },
	});
	const settingsRows = await db.query.userSettings.findMany({
		where: targetUserId ? eq(userSettings.userId, targetUserId) : undefined,
		columns: { userId: true, digestIntervalDays: true, timezone: true, preferredSendHour: true },
	});
	const proUsers = await getProUsers(users.map((userRow) => userRow.id));
	const sentDigests = await db.query.noteDigests.findMany({
		where: targetUserId
			? and(eq(noteDigests.status, "sent"), eq(noteDigests.userId, targetUserId))
			: eq(noteDigests.status, "sent"),
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
		const requestedInterval = settings?.digestIntervalDays ?? DEFAULT_DIGEST_INTERVAL_DAYS;
		const timezone = settings?.timezone ?? "UTC";
		const preferredSendHour = settings?.preferredSendHour ?? 8;
		const isPro = proUsers.has(candidate.id);
		const limits = isPro ? PLANS.pro.limits : PLANS.free.limits;
		const effectiveIntervalDays = clampIntervalToLimits({ requested: requestedInterval, limits });
		const lastSentAt = lastSentMap.get(candidate.id) ?? null;
		const shouldBypassSchedule = skipScheduleForFirstDigest && !lastSentAt;

		if (
			!isDigestDueWithTimezone({ now, lastSentAt, intervalDays: effectiveIntervalDays, timezone, preferredSendHour }) &&
			!shouldBypassSchedule
		) {
			console.log(
				`[send-due-digests] Skipping user ${candidate.id} - not due yet (interval: ${effectiveIntervalDays} days, tz: ${timezone}, hour: ${preferredSendHour}, last sent: ${lastSentAt?.toISOString()})`,
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

		const isFirstDigest = !lastSentAt;

		// For first digest, fetch additional context
		let totalNoteCount = 0;
		let primarySourceLabel: string | null = null;

		if (isFirstDigest) {
			const [noteCountRow] = await db
				.select({ count: sql<number>`count(${documents.id})`.mapWith(Number) })
				.from(documents)
				.where(and(eq(documents.userId, candidate.id), isNull(documents.deletedAtSource)))
				.limit(1);
			totalNoteCount = noteCountRow?.count ?? 0;

			const primaryConnection = await db.query.integrationConnections.findFirst({
				where: and(eq(integrationConnections.userId, candidate.id), eq(integrationConnections.status, "active")),
				columns: { kind: true, displayName: true },
				orderBy: [desc(integrationConnections.createdAt)],
			});

			if (primaryConnection) {
				const kindLabel = primaryConnection.kind === "obsidian" ? "Obsidian" : "Notion";
				primarySourceLabel = primaryConnection.displayName ? `${kindLabel} (${primaryConnection.displayName})` : kindLabel;
			}
		}

		const email = buildDigestEmail({
			intervalDays: effectiveIntervalDays,
			userName: candidate.name,
			frontendUrl: FRONTEND_URL,
			digest: snapshot,
			isFirstDigest,
			totalNoteCount,
			sourceLabel: primarySourceLabel,
			isPro,
			founderEmail: REPLY_TO ?? "younes@notionist.app",
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
					{ name: "interval_days", value: String(effectiveIntervalDays) },
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
