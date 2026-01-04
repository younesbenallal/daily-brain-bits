import { CryptoHasher } from "bun";
import { Hono } from "hono";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import {
  syncBatchRequestSchema,
  type SyncBatchResponse,
} from "@daily-brain-bits/integrations-obsidian";
import {
  db,
  documents,
  integrationConnections,
  obsidianVaults,
  syncState,
} from "@daily-brain-bits/db";

const registerRequestSchema = z.object({
  userId: z.string().min(1),
  displayName: z.string().min(1).optional(),
});

function hashToken(token: string): string {
  const hasher = new CryptoHasher("sha256");
  hasher.update(token);
  return bytesToHex(hasher.digest());
}

function bytesToHex(bytes: Uint8Array): string {
  let hex = "";
  for (const byte of bytes) {
    hex += byte.toString(16).padStart(2, "0");
  }
  return hex;
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

function fallbackTitle(path: string): string {
  const parts = path.split("/");
  const last = parts[parts.length - 1] || path;
  return last.replace(/\.md$/i, "");
}

export const obsidianRouter = new Hono();

obsidianRouter.post("/v1/integrations/obsidian/register", async (c) => {
  const payload = registerRequestSchema.parse(await c.req.json());
  const vaultId = crypto.randomUUID();
  const pluginToken = crypto.randomUUID();
  const apiBaseUrl = new URL(c.req.url).origin;

  const [connection] = await db
    .insert(integrationConnections)
    .values({
      userId: payload.userId,
      kind: "obsidian",
      status: "active",
      displayName: payload.displayName ?? "Obsidian Vault",
      accountExternalId: vaultId,
      configJson: {
        vaultId,
      },
      secretsJsonEncrypted: null,
    })
    .returning({
      id: integrationConnections.id,
    });

  await db.insert(obsidianVaults).values({
    vaultId,
    userId: payload.userId,
    connectionId: connection?.id,
    pluginTokenHash: hashToken(pluginToken),
    deviceIdsJson: [],
    settingsJson: {},
  });

  if (connection?.id) {
    await db.insert(syncState).values({
      connectionId: connection.id,
    });
  }

  return c.json({
    pluginToken,
    vaultId,
    apiBaseUrl,
    connectionId: connection?.id,
  });
});

obsidianRouter.post("/v1/integrations/obsidian/sync/batch", async (c) => {
  const payload = syncBatchRequestSchema.parse(await c.req.json());
  const connection = await db
    .select({
      id: integrationConnections.id,
      userId: integrationConnections.userId,
    })
    .from(integrationConnections)
    .where(
      and(
        eq(integrationConnections.kind, "obsidian"),
        eq(integrationConnections.accountExternalId, payload.vaultId)
      )
    )
    .limit(1);

  if (connection.length === 0) {
    return c.json({
      accepted: 0,
      rejected: payload.items.length,
      itemResults: payload.items.map((item) => ({
        externalId: item.externalId,
        status: "rejected",
        reason: "unknown_vault",
      })),
    } satisfies SyncBatchResponse, 404);
  }

  const connectionId = connection[0].id;
  const userId = connection[0].userId;
  const now = new Date();

  let accepted = 0;
  let rejected = 0;
  const itemResults: SyncBatchResponse["itemResults"] = [];

  for (const item of payload.items) {
    try {
      if (item.op === "upsert") {
        const contentFields = encodeContent(item.contentMarkdown);
        const metadataJson = {
          path: item.path,
          ...item.metadata,
        };

        await db
          .insert(documents)
          .values({
            userId,
            connectionId,
            externalId: item.externalId,
            title: item.title ?? fallbackTitle(item.path),
            contentHash: item.contentHash,
            createdAtSource: null,
            updatedAtSource: item.updatedAtSource
              ? new Date(item.updatedAtSource)
              : null,
            deletedAtSource: null,
            lastSyncedAt: now,
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
              title: item.title ?? fallbackTitle(item.path),
              contentHash: item.contentHash,
              updatedAtSource: item.updatedAtSource
                ? new Date(item.updatedAtSource)
                : null,
              deletedAtSource: null,
              lastSyncedAt: now,
              metadataJson,
              ...contentFields,
            },
          });

        accepted += 1;
        itemResults.push({
          externalId: item.externalId,
          status: "accepted",
        });
        continue;
      }

      await db
        .update(documents)
        .set({
          deletedAtSource: item.updatedAtSource
            ? new Date(item.updatedAtSource)
            : now,
          lastSyncedAt: now,
        })
        .where(
          and(
            eq(documents.userId, userId),
            eq(documents.connectionId, connectionId),
            eq(documents.externalId, item.externalId)
          )
        );

      accepted += 1;
      itemResults.push({
        externalId: item.externalId,
        status: "accepted",
      });
    } catch (error) {
      console.error("Obsidian sync item failed", error);
      rejected += 1;
      itemResults.push({
        externalId: item.externalId,
        status: "rejected",
        reason: "server_error",
      });
    }
  }

  await db
    .update(integrationConnections)
    .set({
      lastSeenAt: now,
    })
    .where(eq(integrationConnections.id, connectionId));

  await db
    .update(obsidianVaults)
    .set({
      lastSeenAt: now,
      updatedAt: now,
    })
    .where(eq(obsidianVaults.vaultId, payload.vaultId));

  await db
    .insert(syncState)
    .values({
      connectionId,
      lastIncrementalSyncAt: now,
    })
    .onConflictDoUpdate({
      target: [syncState.connectionId],
      set: {
        lastIncrementalSyncAt: now,
        updatedAt: now,
      },
    });

  return c.json({
    accepted,
    rejected,
    itemResults,
  } satisfies SyncBatchResponse);
});
