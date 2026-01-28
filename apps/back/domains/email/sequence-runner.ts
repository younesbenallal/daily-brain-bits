import { db, emailSequenceStates, noteDigests } from "@daily-brain-bits/db";
import { and, eq, inArray, sql } from "drizzle-orm";
import { getAllProUsers, isBillingEnabled } from "../billing/entitlements";
import {
	buildSequenceContextFromMaps,
	loadDigestStats,
	loadIntegrationSummary,
	loadUsers,
	loadUserSettings,
	type IntegrationSummary,
	type SequenceContext,
} from "./sequence-context";
import {
	buildSequenceIdempotencyKey,
	buildTemplateParams,
	recordSequenceSend,
	sendSequenceEmail,
	buildSequenceEmail,
} from "./sequence-send";
import {
	advanceSequenceState,
	loadSequenceState,
	markSequenceCompleted,
	type SequenceStateRow,
} from "./sequence-state";
import {
	getSequenceStepDueAt,
	getSequenceStepEmailId,
	type EmailSequenceName,
} from "./sequence-schedule";
import type { SequenceEmailId } from "./sequence-templates";

export type { EmailSequenceName } from "./sequence-schedule";

const SEQUENCE_NAMES: EmailSequenceName[] = ["welcome", "onboarding", "upgrade"];

export type SequenceProcessResult =
	| { status: "sent"; emailId: SequenceEmailId }
	| { status: "not_due"; dueAt: Date }
	| { status: "blocked" }
	| { status: "completed" }
	| { status: "exited" }
	| { status: "skipped" }
	| { status: "failed"; error: Error };

export async function runEmailSequenceRunner(options?: { now?: Date; dryRun?: boolean }) {
	const now = options?.now ?? new Date();
	const dryRun = options?.dryRun ?? false;
	const billingEnabled = isBillingEnabled();

	const activeStates = await db.query.emailSequenceStates.findMany({
		where: and(eq(emailSequenceStates.status, "active"), inArray(emailSequenceStates.sequenceName, SEQUENCE_NAMES)),
		columns: {
			id: true,
			userId: true,
			sequenceName: true,
			currentStep: true,
			enteredAt: true,
			lastEmailSentAt: true,
			status: true,
		},
	});

	if (activeStates.length === 0) {
		return;
	}

	const userIds = Array.from(new Set(activeStates.map((state) => state.userId)));
	const proUsers = await getAllProUsers();
	await discoverUpgradeSequenceEntries({ now, proUsers, billingEnabled });
	const users = await loadUsers(userIds);
	const userSettingsMap = await loadUserSettings(userIds);
	const integrationMap = await loadIntegrationSummary(userIds);
	const digestStatsMap = await loadDigestStats(userIds);

	for (const state of activeStates) {
		const context = buildSequenceContextFromMaps({
			userId: state.userId,
			users,
			userSettingsMap,
			integrationMap,
			digestStatsMap,
			proUsers,
			billingEnabled,
		});

		const result = await processSequenceState({
			state,
			context,
			now,
			dryRun,
		});

		if (result.status === "failed") {
			console.error("[email-sequences] send failed", {
				sequenceName: state.sequenceName,
				userId: state.userId,
				error: result.error,
			});
		}
	}
}

export async function processSequenceState(params: {
	state: SequenceStateRow;
	context: SequenceContext;
	now: Date;
	dryRun: boolean;
}): Promise<SequenceProcessResult> {
	const userRow = params.context.user;
	if (!userRow?.email || !userRow.emailVerified) {
		return { status: "skipped" };
	}

	if (
		await handleExitConditions({
			state: params.state,
			isPro: params.context.isPro,
			billingEnabled: params.context.billingEnabled,
			integrationSummary: params.context.integrationSummary,
			now: params.now,
		})
	) {
		return { status: "exited" };
	}

	const emailId = getSequenceStepEmailId(params.state.sequenceName, params.state.currentStep);
	if (!emailId) {
		await markSequenceCompleted(params.state, params.now);
		return { status: "completed" };
	}

	const dueAt = getSequenceStepDueAt({
		sequenceName: params.state.sequenceName,
		step: params.state.currentStep,
		enteredAt: params.state.enteredAt,
		firstDigestSentAt: params.context.digestStats?.firstDigestSentAt ?? null,
	});

	if (!dueAt) {
		return { status: "blocked" };
	}

	if (dueAt.getTime() > params.now.getTime()) {
		return { status: "not_due", dueAt };
	}

	const templateParams = buildTemplateParams({
		user: userRow,
		settings: params.context.settings,
		integrationSummary: params.context.integrationSummary,
		digestStats: params.context.digestStats,
		isPro: params.context.isPro,
	});

	const emailPayload = buildSequenceEmail({ emailId, templateParams });
	const idempotencyKey = buildSequenceIdempotencyKey(params.state.sequenceName, params.state.userId, params.state.currentStep);
	const sendResult = await sendSequenceEmail({
		user: userRow,
		emailId,
		subject: emailPayload.subject,
		react: emailPayload.react,
		text: emailPayload.text,
		idempotencyKey,
		dryRun: params.dryRun,
		sequenceName: params.state.sequenceName,
	});

	if (sendResult.error) {
		return { status: "failed", error: sendResult.error as Error };
	}

	await recordSequenceSend({
		userId: params.state.userId,
		emailId,
		sequenceName: params.state.sequenceName,
		idempotencyKey,
		resendId: sendResult.id ?? null,
		payloadJson: { provider: "resend", step: params.state.currentStep },
	});

	await advanceSequenceState(params.state, params.now);

	return { status: "sent", emailId };
}

async function handleExitConditions(params: {
	state: SequenceStateRow;
	isPro: boolean;
	billingEnabled: boolean;
	integrationSummary: IntegrationSummary;
	now: Date;
}): Promise<boolean> {
	const shouldExitWelcome = params.state.sequenceName === "welcome" && params.integrationSummary.hasAny;
	const shouldExitOnboarding = params.state.sequenceName === "onboarding" && params.billingEnabled && params.isPro;
	const shouldExitUpgrade = params.state.sequenceName === "upgrade" && params.billingEnabled && params.isPro;

	if (!shouldExitWelcome && !shouldExitOnboarding && !shouldExitUpgrade) {
		return false;
	}

	const exitReason = shouldExitWelcome ? "connected" : "upgraded";
	await db
		.update(emailSequenceStates)
		.set({
			status: "exited",
			exitReason,
			completedAt: params.now,
		})
		.where(eq(emailSequenceStates.id, params.state.id));
	return true;
}

/**
 * Discovers users who qualify for the upgrade sequence and creates entries for them.
 * A user qualifies if:
 * - They have received at least 4 digests
 * - They are not already a Pro user
 * - They don't already have an upgrade sequence entry
 */
export async function discoverUpgradeSequenceEntries(params: { now: Date; proUsers: Set<string>; billingEnabled?: boolean }) {
	if (params.billingEnabled === false) {
		return [];
	}

	const existing = await db.query.emailSequenceStates.findMany({
		where: eq(emailSequenceStates.sequenceName, "upgrade"),
		columns: { userId: true },
	});
	const existingSet = new Set(existing.map((row) => row.userId));

	const candidates = await db
		.select({
			userId: noteDigests.userId,
			digestCount: sql<number>`count(${noteDigests.id})`.mapWith(Number),
		})
		.from(noteDigests)
		.where(eq(noteDigests.status, "sent"))
		.groupBy(noteDigests.userId)
		.having(sql`count(${noteDigests.id}) >= 4`);

	const rowsToInsert = candidates
		.filter((candidate) => !params.proUsers.has(candidate.userId))
		.filter((candidate) => !existingSet.has(candidate.userId))
		.map((candidate) => ({
			userId: candidate.userId,
			sequenceName: "upgrade" as const,
			currentStep: 1,
			status: "active" as const,
			enteredAt: params.now,
		}));

	if (rowsToInsert.length === 0) {
		return [];
	}

	await db.insert(emailSequenceStates).values(rowsToInsert).onConflictDoNothing();

	return rowsToInsert.map((row) => row.userId);
}
