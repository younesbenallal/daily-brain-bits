import {
	db,
	emailSends,
	emailSequenceStates,
	integrationConnections,
	noteDigestItems,
	noteDigests,
	user,
	userSettings,
} from "@daily-brain-bits/db";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import * as React from "react";
import { PLANS } from "@daily-brain-bits/core";
import { resolveEffectiveFrequency, type DigestFrequency } from "./digest-schedule";
import { getAllProUsers, getProUsers, isBillingEnabled } from "./entitlements";
import { env } from "./env";
import { buildSequenceEmail, type SequenceEmailId } from "./email-sequence-templates";
import {
	getSequenceStepEmailId,
	getSequenceStepDueAt,
	getSequenceTotalSteps,
	type EmailSequenceName,
} from "./email-sequence-schedule";
import { sendResendEmail } from "./resend";

export type { EmailSequenceName } from "./email-sequence-schedule";

const DEFAULT_SETTINGS = {
	emailFrequency: "daily" as DigestFrequency,
	notesPerDigest: 5,
	quizEnabled: false,
};

const SEQUENCE_NAMES: EmailSequenceName[] = ["welcome", "onboarding", "upgrade"];

const DEFAULT_SURVEY_PATH = "/feedback";
const DEFAULT_UPGRADE_PATH = "/settings?tab=billing";

export type SequenceStateRow = {
	id: number;
	userId: string;
	sequenceName: EmailSequenceName;
	currentStep: number;
	enteredAt: Date;
	lastEmailSentAt: Date | null;
	status: "active" | "completed" | "exited";
};

export type UserRow = {
	id: string;
	name: string | null;
	email: string;
	emailVerified: boolean;
};

export type IntegrationSummary = {
	hasAny: boolean;
	primaryKind: "notion" | "obsidian" | null;
};

export type DigestStats = {
	digestCount: number;
	noteCount: number;
	firstDigestSentAt: Date | null;
};

export type SequenceContext = {
	user: UserRow | null;
	settings: typeof DEFAULT_SETTINGS;
	integrationSummary: IntegrationSummary;
	digestStats?: DigestStats;
	isPro: boolean;
	billingEnabled: boolean;
};

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
	await ensureUpgradeSequenceEntries({ now, proUsers, billingEnabled });
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

export async function loadSequenceState(params: {
	userId: string;
	sequenceName: EmailSequenceName;
}): Promise<SequenceStateRow | null> {
	const result = await db.query.emailSequenceStates.findFirst({
		where: and(eq(emailSequenceStates.userId, params.userId), eq(emailSequenceStates.sequenceName, params.sequenceName)),
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
	return result ?? null;
}

export async function loadSequenceContextForUser(userId: string): Promise<SequenceContext> {
	const billingEnabled = isBillingEnabled();
	const [proUsers, users, userSettingsMap, integrationMap, digestStatsMap] = await Promise.all([
		getProUsers([userId]),
		loadUsers([userId]),
		loadUserSettings([userId]),
		loadIntegrationSummary([userId]),
		loadDigestStats([userId]),
	]);

	return buildSequenceContextFromMaps({
		userId,
		users,
		userSettingsMap,
		integrationMap,
		digestStatsMap,
		proUsers,
		billingEnabled,
	});
}

function buildSequenceContextFromMaps(params: {
	userId: string;
	users: Map<string, UserRow>;
	userSettingsMap: Map<string, typeof DEFAULT_SETTINGS>;
	integrationMap: Map<string, IntegrationSummary>;
	digestStatsMap: Map<string, DigestStats>;
	proUsers: Set<string>;
	billingEnabled: boolean;
}): SequenceContext {
	const userRow = params.users.get(params.userId) ?? null;
	const settings = params.userSettingsMap.get(params.userId) ?? DEFAULT_SETTINGS;
	const integrationSummary = params.integrationMap.get(params.userId) ?? { hasAny: false, primaryKind: null };
	const digestStats = params.digestStatsMap.get(params.userId);
	const isPro = params.proUsers.has(params.userId);

	return {
		user: userRow,
		settings,
		integrationSummary,
		digestStats,
		isPro,
		billingEnabled: params.billingEnabled,
	};
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

export async function loadProUsers(): Promise<Set<string>> {
	return getAllProUsers();
}

async function loadUsers(userIds: string[]): Promise<Map<string, UserRow>> {
	if (userIds.length === 0) {
		return new Map();
	}

	const rows = await db.query.user.findMany({
		where: inArray(user.id, userIds),
		columns: { id: true, name: true, email: true, emailVerified: true },
	});

	return new Map(rows.map((row) => [row.id, row]));
}

async function loadUserSettings(userIds: string[]) {
	if (userIds.length === 0) {
		return new Map<string, typeof DEFAULT_SETTINGS>();
	}

	const rows = await db.query.userSettings.findMany({
		where: inArray(userSettings.userId, userIds),
		columns: { userId: true, emailFrequency: true, notesPerDigest: true, quizEnabled: true },
	});

	return new Map(rows.map((row) => [row.userId, row]));
}

async function loadIntegrationSummary(userIds: string[]): Promise<Map<string, IntegrationSummary>> {
	if (userIds.length === 0) {
		return new Map();
	}

	const rows = await db.query.integrationConnections.findMany({
		where: inArray(integrationConnections.userId, userIds),
		columns: { userId: true, kind: true, createdAt: true },
		orderBy: [desc(integrationConnections.createdAt)],
	});

	const summary = new Map<string, IntegrationSummary>();
	for (const row of rows) {
		const existing = summary.get(row.userId);
		if (!existing) {
			summary.set(row.userId, { hasAny: true, primaryKind: row.kind });
			continue;
		}
		existing.hasAny = true;
	}
	return summary;
}

async function loadDigestStats(userIds: string[]): Promise<Map<string, DigestStats>> {
	if (userIds.length === 0) {
		return new Map();
	}

	const digestCounts = await db
		.select({
			userId: noteDigests.userId,
			digestCount: sql<number>`count(${noteDigests.id})`.mapWith(Number),
		})
		.from(noteDigests)
		.where(and(inArray(noteDigests.userId, userIds), eq(noteDigests.status, "sent")))
		.groupBy(noteDigests.userId);

	const noteCounts = await db
		.select({
			userId: noteDigests.userId,
			noteCount: sql<number>`count(${noteDigestItems.id})`.mapWith(Number),
		})
		.from(noteDigestItems)
		.innerJoin(noteDigests, eq(noteDigestItems.noteDigestId, noteDigests.id))
		.where(and(inArray(noteDigests.userId, userIds), eq(noteDigests.status, "sent")))
		.groupBy(noteDigests.userId);

	const firstDigestRows = await db
		.select({
			userId: noteDigests.userId,
			firstDigestSentAt: sql<Date | null>`min(${noteDigests.sentAt})`,
		})
		.from(noteDigests)
		.where(and(inArray(noteDigests.userId, userIds), eq(noteDigests.status, "sent")))
		.groupBy(noteDigests.userId);

	const digestCountMap = new Map(digestCounts.map((row) => [row.userId, row.digestCount]));
	const noteCountMap = new Map(noteCounts.map((row) => [row.userId, row.noteCount]));
	const firstDigestMap = new Map(firstDigestRows.map((row) => [row.userId, row.firstDigestSentAt ?? null]));

	const stats = new Map<string, DigestStats>();
	for (const userId of userIds) {
		stats.set(userId, {
			digestCount: digestCountMap.get(userId) ?? 0,
			noteCount: noteCountMap.get(userId) ?? 0,
			firstDigestSentAt: firstDigestMap.get(userId) ?? null,
		});
	}

	return stats;
}

export async function ensureUpgradeSequenceEntries(params: { now: Date; proUsers: Set<string>; billingEnabled?: boolean }) {
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

async function markSequenceCompleted(state: SequenceStateRow, now: Date) {
	await db
		.update(emailSequenceStates)
		.set({
			status: "completed",
			completedAt: now,
		})
		.where(eq(emailSequenceStates.id, state.id));
}

async function advanceSequenceState(state: SequenceStateRow, now: Date) {
	const totalSteps = getSequenceTotalSteps(state.sequenceName);
	const nextStep = state.currentStep + 1;

	const updates: Partial<typeof emailSequenceStates.$inferInsert> = {
		lastEmailSentAt: now,
		currentStep: nextStep,
	};

	if (nextStep > totalSteps) {
		updates.status = "completed";
		updates.completedAt = now;
	}

	await db.update(emailSequenceStates).set(updates).where(eq(emailSequenceStates.id, state.id));
}

function buildTemplateParams(options: {
	user: UserRow;
	settings: typeof DEFAULT_SETTINGS;
	integrationSummary: IntegrationSummary;
	digestStats?: DigestStats;
	isPro: boolean;
}) {
	const greetingName = formatFirstName(options.user.name);
	const sourceName = options.integrationSummary.primaryKind === "notion" ? "Notion" : options.integrationSummary.primaryKind === "obsidian" ? "Obsidian" : undefined;
	const features = options.isPro ? PLANS.pro.features : PLANS.free.features;
	const effectiveFrequency = resolveEffectiveFrequency({
		requested: options.settings.emailFrequency,
		features,
	});
	const digestTiming = formatDigestTiming(effectiveFrequency);

	return {
		firstName: greetingName,
		frontendUrl: env.FRONTEND_URL,
		sourceName,
		digestTiming,
		notesPerDigest: options.settings.notesPerDigest,
		totalNoteCount: options.digestStats?.noteCount ?? 0,
		digestCount: options.digestStats?.digestCount ?? 0,
		isPro: options.isPro,
		surveyUrl: buildFrontendUrl(env.FRONTEND_URL, DEFAULT_SURVEY_PATH),
		upgradeUrl: buildFrontendUrl(env.FRONTEND_URL, DEFAULT_UPGRADE_PATH),
	};
}

function formatDigestTiming(frequency: DigestFrequency): string {
	if (frequency === "daily") {
		return "tomorrow morning";
	}
	if (frequency === "weekly") {
		return "later this week";
	}
	return "this month";
}

function formatFirstName(name?: string | null): string {
	if (!name) {
		return "there";
	}
	const trimmed = name.trim();
	if (!trimmed) {
		return "there";
	}
	return trimmed.split(/\s+/)[0] ?? "there";
}

function buildSequenceIdempotencyKey(sequenceName: EmailSequenceName, userId: string, step: number) {
	const raw = `sequence-${sequenceName}-${userId}-${step}`;
	if (raw.length <= 256) {
		return raw;
	}
	return raw.slice(0, 256);
}

async function sendSequenceEmail(params: {
	user: UserRow;
	emailId: SequenceEmailId;
	subject: string;
	react: React.ReactElement;
	text: string;
	idempotencyKey: string;
	dryRun: boolean;
	sequenceName: EmailSequenceName;
}) {
	const tags = [
		{ name: "email_type", value: "sequence" },
		{ name: "sequence", value: params.sequenceName },
		{ name: "step", value: String(params.emailId) },
	];

	return sendResendEmail({
		payload: {
			from: env.RESEND_FROM,
			to: params.user.email,
			subject: params.subject,
			react: params.react,
			text: params.text,
			replyTo: env.RESEND_REPLY_TO ?? undefined,
			tags: tags.map((tag) => ({ name: tag.name, value: sanitizeTagValue(tag.value) })),
		},
		idempotencyKey: params.idempotencyKey,
		dryRun: params.dryRun || env.SEQUENCE_EMAIL_DRY_RUN,
		retry: { maxRetries: 3, initialDelayMs: 1000 },
	});
}

async function recordSequenceSend(params: {
	userId: string;
	emailId: SequenceEmailId;
	sequenceName: EmailSequenceName;
	idempotencyKey: string;
	resendId: string | null;
	payloadJson: Record<string, unknown>;
}) {
	await db
		.insert(emailSends)
		.values({
			userId: params.userId,
			sequenceName: params.sequenceName,
			emailName: params.emailId,
			idempotencyKey: params.idempotencyKey,
			resendId: params.resendId,
			payloadJson: params.payloadJson,
		})
		.onConflictDoNothing();
}

function sanitizeTagValue(value: string) {
	return value.replace(/[^A-Za-z0-9_-]/g, "-").slice(0, 256);
}

function buildFrontendUrl(frontendUrl: string, path: string) {
	const base = frontendUrl.replace(/\/$/, "");
	if (!path.startsWith("/")) {
		return `${base}/${path}`;
	}
	return `${base}${path}`;
}
