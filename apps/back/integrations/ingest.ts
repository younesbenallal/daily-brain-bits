import type { SyncCursor, SyncItem } from "@daily-brain-bits/core";
import {
	encryptContent,
	isEncryptionConfigured,
	normalizeForHash,
	sha256Hex,
	syncItemDeleteSchema,
	syncItemSchema,
	syncItemUpsertSchema,
} from "@daily-brain-bits/core";
import { db, documents, syncState } from "@daily-brain-bits/db";
import { and, eq, inArray } from "drizzle-orm";
import { countUserDocuments, getUserEntitlements } from "../domains/billing/entitlements";
import { resolveDeleteDecision, resolveUpsertDecision } from "./sync-decisions";

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
	const sizeBytes = Buffer.byteLength(contentMarkdown, "utf8");

	// Use encryption if configured, otherwise fall back to base64 encoding
	if (isEncryptionConfigured()) {
		const encrypted = encryptContent(contentMarkdown);
		return {
			contentCiphertext: encrypted.ciphertext,
			contentIv: encrypted.iv,
			contentAlg: encrypted.alg,
			contentKeyVersion: encrypted.keyVersion,
			contentSizeBytes: sizeBytes,
		};
	}

	// Legacy fallback: base64 encoding (no encryption)
	return {
		contentCiphertext: Buffer.from(contentMarkdown, "utf8").toString("base64"),
		contentIv: "none",
		contentAlg: "none",
		contentKeyVersion: 0,
		contentSizeBytes: sizeBytes,
	};
}

export async function ingestSyncItems(params: IngestParams): Promise<IngestResult> {
	const { connectionId, userId, items, receivedAt, nextCursor } = params;

	let accepted = 0;
	let rejected = 0;
	let skipped = 0;
	const itemResults: IngestResult["itemResults"] = [];

	// Phase 1: Parse all items and separate valid from invalid
	const parsedItems: Array<{ item: SyncItem; raw: unknown }> = [];
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
		parsedItems.push({ item: parsed.data, raw: rawItem });
	}

	if (parsedItems.length === 0) {
		await updateSyncState(connectionId, receivedAt, nextCursor);
		return { accepted, rejected, skipped, itemResults };
	}

	// Phase 2: Bulk fetch all existing documents in one query
	const externalIds = parsedItems.map((p) => p.item.externalId);
	const existingDocs = await db
		.select({
			externalId: documents.externalId,
			contentHash: documents.contentHash,
			updatedAtSource: documents.updatedAtSource,
			deletedAtSource: documents.deletedAtSource,
		})
		.from(documents)
		.where(and(eq(documents.userId, userId), eq(documents.connectionId, connectionId), inArray(documents.externalId, externalIds)));

	const existingMap = new Map(existingDocs.map((d) => [d.externalId, d]));

	// Phase 3: Check entitlements for note limits
	const entitlements = await getUserEntitlements(userId);
	const noteLimit = entitlements.limits.maxNotes;
	let remainingSlots = Number.POSITIVE_INFINITY;
	if (noteLimit !== Number.POSITIVE_INFINITY) {
		const currentCount = await countUserDocuments(userId);
		remainingSlots = Math.max(0, noteLimit - currentCount);
	}

	// Phase 4: Process decisions and collect operations
	type UpsertOp = {
		type: "upsert";
		externalId: string;
		values: typeof documents.$inferInsert;
		isNew: boolean;
	};
	type DeleteUpdateOp = {
		type: "delete_update";
		externalId: string;
		deletedAtSource: Date | null;
		updatedAtSource: Date | null;
		metadataJson: unknown;
		wasDeleted: boolean;
	};
	type TombstoneOp = {
		type: "tombstone";
		externalId: string;
		values: typeof documents.$inferInsert;
	};

	const upsertOps: UpsertOp[] = [];
	const deleteUpdateOps: DeleteUpdateOp[] = [];
	const tombstoneOps: TombstoneOp[] = [];

	for (const { item } of parsedItems) {
		const existing = existingMap.get(item.externalId) ?? null;

		try {
			if (item.op === "upsert") {
				const upsert = syncItemUpsertSchema.parse(item);
				const decision = resolveUpsertDecision(existing, upsert, receivedAt);

				if (decision.action === "skip") {
					skipped += 1;
					itemResults.push({
						externalId: upsert.externalId,
						status: "skipped",
						reason: decision.reason,
					});
					continue;
				}

				const isNew = !existing;
				if (isNew && remainingSlots <= 0) {
					rejected += 1;
					itemResults.push({
						externalId: upsert.externalId,
						status: "rejected",
						reason: "note_limit_reached",
					});
					continue;
				}

				const contentFields = encodeContent(upsert.contentMarkdown);
				const metadataJson = upsert.metadata ?? null;

				upsertOps.push({
					type: "upsert",
					externalId: upsert.externalId,
					isNew,
					values: {
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
					},
				});

				accepted += 1;
				itemResults.push({
					externalId: upsert.externalId,
					status: "accepted",
				});

				if (isNew && remainingSlots !== Number.POSITIVE_INFINITY) {
					remainingSlots = Math.max(0, remainingSlots - 1);
				}
				continue;
			}

			// Delete operation
			const deleted = syncItemDeleteSchema.parse(item);
			const decision = resolveDeleteDecision(existing, deleted, receivedAt);

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

				tombstoneOps.push({
					type: "tombstone",
					externalId: deleted.externalId,
					values: {
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
					},
				});

				accepted += 1;
				itemResults.push({
					externalId: deleted.externalId,
					status: "accepted",
				});
				continue;
			}

			deleteUpdateOps.push({
				type: "delete_update",
				externalId: deleted.externalId,
				deletedAtSource: parseDateOrNull(deleted.deletedAtSource),
				updatedAtSource: parseDateOrNull(deleted.updatedAtSource ?? null),
				metadataJson: deleted.metadata ?? null,
				wasDeleted: existing ? !existing.deletedAtSource : false,
			});

			accepted += 1;
			itemResults.push({
				externalId: deleted.externalId,
				status: "accepted",
			});

			if (existing && !existing.deletedAtSource && remainingSlots !== Number.POSITIVE_INFINITY) {
				remainingSlots += 1;
			}
		} catch (error) {
			console.error("Sync item failed", error);
			rejected += 1;
			itemResults.push({
				externalId: item.externalId,
				status: "rejected",
				reason: "server_error",
			});
		}
	}

	// Phase 5: Execute bulk operations
	// Upserts - use individual onConflictDoUpdate since Drizzle doesn't support bulk upsert with different values
	// But we batch them in a transaction for better performance
	if (upsertOps.length > 0 || tombstoneOps.length > 0 || deleteUpdateOps.length > 0) {
		await db.transaction(async (tx) => {
			// Bulk upserts
			for (const op of upsertOps) {
				await tx
					.insert(documents)
					.values(op.values)
					.onConflictDoUpdate({
						target: [documents.userId, documents.connectionId, documents.externalId],
						set: {
							title: op.values.title,
							contentHash: op.values.contentHash,
							updatedAtSource: op.values.updatedAtSource,
							deletedAtSource: null,
							lastSyncedAt: receivedAt,
							metadataJson: op.values.metadataJson,
							contentCiphertext: op.values.contentCiphertext,
							contentIv: op.values.contentIv,
							contentAlg: op.values.contentAlg,
							contentKeyVersion: op.values.contentKeyVersion,
							contentSizeBytes: op.values.contentSizeBytes,
						},
					});
			}

			// Bulk tombstones (inserts only, no conflict expected)
			for (const op of tombstoneOps) {
				await tx.insert(documents).values(op.values);
			}

			// Bulk delete updates
			for (const op of deleteUpdateOps) {
				await tx
					.update(documents)
					.set({
						deletedAtSource: op.deletedAtSource,
						updatedAtSource: op.updatedAtSource,
						lastSyncedAt: receivedAt,
						metadataJson: op.metadataJson,
					})
					.where(and(eq(documents.userId, userId), eq(documents.connectionId, connectionId), eq(documents.externalId, op.externalId)));
			}
		});
	}

	await updateSyncState(connectionId, receivedAt, nextCursor);

	return {
		accepted,
		rejected,
		skipped,
		itemResults,
	};
}

async function updateSyncState(connectionId: number, receivedAt: Date, nextCursor?: SyncCursor | null) {
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
}
