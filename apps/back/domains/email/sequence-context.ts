import {
	db,
	integrationConnections,
	noteDigestItems,
	noteDigests,
	user,
	userSettings,
} from "@daily-brain-bits/db";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import type { DigestFrequency } from "../digest/schedule";
import { getProUsers, isBillingEnabled } from "../billing/entitlements";

const DEFAULT_SETTINGS = {
	emailFrequency: "daily" as DigestFrequency,
	notesPerDigest: 5,
	quizEnabled: false,
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

export function buildSequenceContextFromMaps(params: {
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

export async function loadUsers(userIds: string[]): Promise<Map<string, UserRow>> {
	if (userIds.length === 0) {
		return new Map();
	}

	const rows = await db.query.user.findMany({
		where: inArray(user.id, userIds),
		columns: { id: true, name: true, email: true, emailVerified: true },
	});

	return new Map(rows.map((row) => [row.id, row]));
}

export async function loadUserSettings(userIds: string[]) {
	if (userIds.length === 0) {
		return new Map<string, typeof DEFAULT_SETTINGS>();
	}

	const rows = await db.query.userSettings.findMany({
		where: inArray(userSettings.userId, userIds),
		columns: { userId: true, emailFrequency: true, notesPerDigest: true, quizEnabled: true },
	});

	return new Map(rows.map((row) => [row.userId, row]));
}

export async function loadIntegrationSummary(userIds: string[]): Promise<Map<string, IntegrationSummary>> {
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

export async function loadDigestStats(userIds: string[]): Promise<Map<string, DigestStats>> {
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

export { DEFAULT_SETTINGS };
