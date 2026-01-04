import type { SyncCursor, SyncItem } from "@daily-brain-bits/core";
import {
  syncItemSchema,
  syncItemDeleteSchema,
  syncItemUpsertSchema,
} from "@daily-brain-bits/core";
import { and, eq } from "drizzle-orm";
import { db, documents, syncState } from "@daily-brain-bits/db";

export type IngestResult = {
  accepted: number;
  rejected: number;
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

export async function ingestSyncItems(
  params: IngestParams
): Promise<IngestResult> {
  const { connectionId, userId, items, receivedAt, nextCursor } = params;

  let accepted = 0;
  let rejected = 0;
  const itemResults: IngestResult["itemResults"] = [];

  for (const rawItem of items) {
    const parsed = syncItemSchema.safeParse(rawItem);
    if (!parsed.success) {
      rejected += 1;
      itemResults.push({
        externalId: "unknown",
        status: "rejected",
        reason: "invalid_item",
      });
      continue;
    }

    const item: SyncItem = parsed.data;

    try {
      if (item.op === "upsert") {
        const upsert = syncItemUpsertSchema.parse(item);
        const contentFields = encodeContent(upsert.contentMarkdown);
        const metadataJson = upsert.metadata ?? null;

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
            target: [
              documents.userId,
              documents.connectionId,
              documents.externalId,
            ],
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

      await db
        .update(documents)
        .set({
          deletedAtSource: parseDateOrNull(deleted.deletedAtSource),
          updatedAtSource: parseDateOrNull(deleted.updatedAtSource ?? null),
          lastSyncedAt: receivedAt,
          metadataJson: deleted.metadata ?? null,
        })
        .where(
          and(
            eq(documents.userId, userId),
            eq(documents.connectionId, connectionId),
            eq(documents.externalId, deleted.externalId)
          )
        );

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

  await db
    .insert(syncState)
    .values({
      connectionId,
      lastIncrementalSyncAt: receivedAt,
      cursorJson: nextCursor ?? undefined,
    })
    .onConflictDoUpdate({
      target: [syncState.connectionId],
      set: {
        lastIncrementalSyncAt: receivedAt,
        cursorJson: nextCursor ?? undefined,
        updatedAt: receivedAt,
      },
    });

  return {
    accepted,
    rejected,
    itemResults,
  };
}
