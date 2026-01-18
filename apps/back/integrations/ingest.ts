import type { SyncCursor, SyncItem } from "@daily-brain-bits/core";
import { normalizeForHash, sha256Hex, syncItemDeleteSchema, syncItemSchema, syncItemUpsertSchema } from "@daily-brain-bits/core";
import { db, documents, syncState } from "@daily-brain-bits/db";
import { and, eq } from "drizzle-orm";
import type { z } from "zod";

export type IngestResult = {
	accepted: number;
	rejected: number;
	skipped: number;
	itemResults: Array<{
		externalId: string;
		status: "accepted" | "rejected" | "skipped";
		reason?: string;
	}>;
};

type IngestParams = {
	connectionId: number;
	userId: string;
	items: unknown[];
	receivedAt: Date;
	nextCursor?: SyncCursor | null;
};

function parseDateOrNull(value?: string | null): Date | null {
	if (!value) {
		return null;
	}
	const parsed = new Date(value);
	return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function encodeContent(contentMarkdown: string) {
	return {
		contentCiphertext: Buffer.from(contentMarkdown, "utf8").toString("base64"),
		contentIv: "none",
		contentAlg: "none",
		contentKeyVersion: 0,
		contentSizeBytes: Buffer.byteLength(contentMarkdown, "utf8"),
	};
}

type ExistingDocumentSnapshot = {
	contentHash: string;
	updatedAtSource: Date | null;
	deletedAtSource: Date | null;
};

type SyncItemUpsert = z.infer<typeof syncItemUpsertSchema>;
type SyncItemDelete = z.infer<typeof syncItemDeleteSchema>;

type Decision = {
	action: "apply" | "skip";
	reason?: "stale_source_timestamp" | "unchanged";
};

type DeleteDecision = Decision & {
	tombstone?: boolean;
};

function resolveSourceTimeMs(value: string | null | undefined, receivedAt: Date): number {
	const parsed = parseDateOrNull(value);
	return parsed ? parsed.getTime() : receivedAt.getTime();
}

function getExistingSourceTimeMs(existing: ExistingDocumentSnapshot): number | null {
	const updatedMs = existing.updatedAtSource?.getTime() ?? null;
	const deletedMs = existing.deletedAtSource?.getTime() ?? null;
	if (updatedMs === null && deletedMs === null) {
		return null;
	}
	return Math.max(updatedMs ?? 0, deletedMs ?? 0);
}

export function resolveUpsertDecision(existing: ExistingDocumentSnapshot | null, upsert: SyncItemUpsert, receivedAt: Date): Decision {
	if (!existing) {
		return { action: "apply" };
	}

	const incomingMs = resolveSourceTimeMs(upsert.updatedAtSource ?? null, receivedAt);
	const existingMs = getExistingSourceTimeMs(existing);

	if (existingMs !== null && incomingMs < existingMs) {
		return { action: "skip", reason: "stale_source_timestamp" };
	}

	if (existingMs !== null && incomingMs === existingMs) {
		if (existing.deletedAtSource) {
			return { action: "skip", reason: "stale_source_timestamp" };
		}
		if (existing.contentHash === upsert.contentHash) {
			return { action: "skip", reason: "unchanged" };
		}
	}

	return { action: "apply" };
}

export function resolveDeleteDecision(existing: ExistingDocumentSnapshot | null, deleted: SyncItemDelete, receivedAt: Date): DeleteDecision {
	if (!existing) {
		return { action: "apply", tombstone: true };
	}

	const incomingMs = resolveSourceTimeMs(deleted.deletedAtSource, receivedAt);
	const existingMs = getExistingSourceTimeMs(existing);

	if (existingMs !== null && incomingMs <= existingMs) {
		return { action: "skip", reason: "stale_source_timestamp" };
	}

	return { action: "apply" };
}

export async function ingestSyncItems(params: IngestParams): Promise<IngestResult> {
	const { connectionId, userId, items, receivedAt, nextCursor } = params;

	let accepted = 0;
	let rejected = 0;
	let skipped = 0;
	const itemResults: IngestResult["itemResults"] = [];

	for (const rawItem of items) {
		const parsed = syncItemSchema.safeParse(rawItem);
		if (!parsed.success) {
			const externalId =
				rawItem && typeof rawItem === "object" && "externalId" in rawItem && typeof (rawItem as { externalId?: unknown }).externalId === "string"
					? (rawItem as { externalId: string }).externalId
					: "unknown";
			rejected += 1;
			itemResults.push({
				externalId,
				status: "rejected",
				reason: "invalid_item",
			});
			continue;
		}

		const item: SyncItem = parsed.data;

		const [existing] = await db
			.select({
				contentHash: documents.contentHash,
				updatedAtSource: documents.updatedAtSource,
				deletedAtSource: documents.deletedAtSource,
			})
			.from(documents)
			.where(and(eq(documents.userId, userId), eq(documents.connectionId, connectionId), eq(documents.externalId, parsed.data.externalId)))
			.limit(1);

		try {
			if (item.op === "upsert") {
				const upsert = syncItemUpsertSchema.parse(item);
				const decision = resolveUpsertDecision(existing ?? null, upsert, receivedAt);
				if (decision.action === "skip") {
					skipped += 1;
					itemResults.push({
						externalId: upsert.externalId,
						status: "skipped",
						reason: decision.reason,
					});
					continue;
				}

				const contentFields = encodeContent(upsert.contentMarkdown);
				const metadataJson = upsert.metadata ?? null;
				const metadataRecord =
					metadataJson && typeof metadataJson === "object" && !Array.isArray(metadataJson)
						? (metadataJson as Record<string, unknown>)
						: null;

				console.log("[ingest] upsert metadata", {
					connectionId,
					externalId: upsert.externalId,
					metadataKeys: metadataRecord ? Object.keys(metadataRecord) : [],
					hasPropertiesSummary: Boolean(metadataRecord?.propertiesSummary),
					hasFrontmatter: Boolean(metadataRecord?.frontmatter),
				});

				await db
					.insert(documents)
					.values({
						userId,
						connectionId,
						externalId: upsert.externalId,
						title: upsert.title ?? null,
						contentHash: upsert.contentHash,
						createdAtSource: null,
						updatedAtSource: parseDateOrNull(upsert.updatedAtSource ?? null),
						deletedAtSource: null,
						lastSyncedAt: receivedAt,
						metadataJson,
						...contentFields,
					})
					.onConflictDoUpdate({
						target: [documents.userId, documents.connectionId, documents.externalId],
						set: {
							title: upsert.title ?? null,
							contentHash: upsert.contentHash,
							updatedAtSource: parseDateOrNull(upsert.updatedAtSource ?? null),
							deletedAtSource: null,
							lastSyncedAt: receivedAt,
							metadataJson,
							...contentFields,
						},
					});

				accepted += 1;
				itemResults.push({
					externalId: upsert.externalId,
					status: "accepted",
				});
				continue;
			}

			const deleted = syncItemDeleteSchema.parse(item);
			const decision = resolveDeleteDecision(existing ?? null, deleted, receivedAt);
			if (decision.action === "skip") {
				skipped += 1;
				itemResults.push({
					externalId: deleted.externalId,
					status: "skipped",
					reason: decision.reason,
				});
				continue;
			}

			if (!existing && decision.tombstone) {
				const contentFields = encodeContent("");
				const emptyHash = sha256Hex(normalizeForHash(""));

				await db.insert(documents).values({
					userId,
					connectionId,
					externalId: deleted.externalId,
					title: deleted.title ?? null,
					contentHash: emptyHash,
					createdAtSource: null,
					updatedAtSource: parseDateOrNull(deleted.updatedAtSource ?? null),
					deletedAtSource: parseDateOrNull(deleted.deletedAtSource),
					lastSyncedAt: receivedAt,
					metadataJson: deleted.metadata ?? null,
					...contentFields,
				});

				accepted += 1;
				itemResults.push({
					externalId: deleted.externalId,
					status: "accepted",
				});
				continue;
			}

			await db
				.update(documents)
				.set({
					deletedAtSource: parseDateOrNull(deleted.deletedAtSource),
					updatedAtSource: parseDateOrNull(deleted.updatedAtSource ?? null),
					lastSyncedAt: receivedAt,
					metadataJson: deleted.metadata ?? null,
				})
				.where(and(eq(documents.userId, userId), eq(documents.connectionId, connectionId), eq(documents.externalId, deleted.externalId)));

			accepted += 1;
			itemResults.push({
				externalId: deleted.externalId,
				status: "accepted",
			});
		} catch (error) {
			console.error("Sync item failed", error);
			rejected += 1;
			itemResults.push({
				externalId: parsed.data.externalId,
				status: "rejected",
				reason: "server_error",
			});
		}
	}

	const cursorProvided = nextCursor !== undefined;
	const cursorValue = nextCursor ?? null;

	await db
		.insert(syncState)
		.values({
			connectionId,
			lastIncrementalSyncAt: receivedAt,
			...(cursorProvided ? { cursorJson: cursorValue } : {}),
		})
		.onConflictDoUpdate({
			target: [syncState.connectionId],
			set: {
				lastIncrementalSyncAt: receivedAt,
				...(cursorProvided ? { cursorJson: cursorValue } : {}),
				updatedAt: receivedAt,
			},
		});

	return {
		accepted,
		rejected,
		skipped,
		itemResults,
	};
}
