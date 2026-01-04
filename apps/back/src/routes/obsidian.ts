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
  integrationConnections,
  integrationScopeItems,
  obsidianVaults,
} from "@daily-brain-bits/db";
import { createPathFilter } from "@daily-brain-bits/integrations-obsidian";
import { ingestSyncItems } from "../integrations/ingest";

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

  return c.json({
    pluginToken,
    vaultId,
    apiBaseUrl,
    connectionId: connection?.id,
  });
});

obsidianRouter.get("/v1/integrations/obsidian/scope", async (c) => {
  const vaultId = c.req.query("vaultId");
  if (!vaultId) {
    return c.json({ error: "vaultId is required" }, 400);
  }

  const connection = await db
    .select({
      id: integrationConnections.id,
    })
    .from(integrationConnections)
    .where(
      and(
        eq(integrationConnections.kind, "obsidian"),
        eq(integrationConnections.accountExternalId, vaultId)
      )
    )
    .limit(1);

  if (connection.length === 0) {
    return c.json({ error: "unknown_vault" }, 404);
  }

  const scopeItems = await db
    .select({ value: integrationScopeItems.scopeValue })
    .from(integrationScopeItems)
    .where(
      and(
        eq(integrationScopeItems.connectionId, connection[0].id),
        eq(integrationScopeItems.scopeType, "obsidian_glob"),
        eq(integrationScopeItems.enabled, true)
      )
    );

  return c.json({
    vaultId,
    patterns: scopeItems.map((item) => item.value),
    updatedAt: new Date().toISOString(),
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

  const scopeItems = await db
    .select({ value: integrationScopeItems.scopeValue })
    .from(integrationScopeItems)
    .where(
      and(
        eq(integrationScopeItems.connectionId, connectionId),
        eq(integrationScopeItems.scopeType, "obsidian_glob"),
        eq(integrationScopeItems.enabled, true)
      )
    );

  const scopePatterns = scopeItems.map((item) => item.value).filter(Boolean);
  const allowAll = scopePatterns.length === 0;
  const pathFilter = createPathFilter({ include: scopePatterns });

  const filteredItems: unknown[] = [];
  const itemResults: SyncBatchResponse["itemResults"] = [];
  let rejected = 0;

  for (const item of payload.items) {
    const path =
      item.metadata && typeof item.metadata.path === "string"
        ? item.metadata.path
        : null;
    if (!path) {
      rejected += 1;
      itemResults.push({
        externalId: item.externalId,
        status: "rejected",
        reason: "missing_path",
      });
      continue;
    }

    if (!allowAll && !pathFilter(path)) {
      rejected += 1;
      itemResults.push({
        externalId: item.externalId,
        status: "rejected",
        reason: "out_of_scope",
      });
      continue;
    }

    if (item.op === "upsert") {
      filteredItems.push({
        ...item,
        title: item.title ?? fallbackTitle(path),
        metadata: {
          ...item.metadata,
          path,
        },
      });
      continue;
    }

    filteredItems.push({
      ...item,
      deletedAtSource: item.deletedAtSource ?? payload.sentAt,
      metadata: {
        ...item.metadata,
        path,
      },
    });
  }

  const ingestResult = await ingestSyncItems({
    connectionId,
    userId,
    items: filteredItems,
    receivedAt: now,
    nextCursor: { since: payload.sentAt },
  });

  const accepted = ingestResult.accepted;
  rejected += ingestResult.rejected;
  itemResults.push(...ingestResult.itemResults);

  await db
    .update(integrationConnections)
    .set({
      lastSeenAt: now,
    })
    .where(eq(integrationConnections.id, connectionId));

  const vaultRows = await db
    .select({
      deviceIdsJson: obsidianVaults.deviceIdsJson,
    })
    .from(obsidianVaults)
    .where(eq(obsidianVaults.vaultId, payload.vaultId))
    .limit(1);

  if (payload.deviceId && vaultRows.length > 0) {
    const existing = Array.isArray(vaultRows[0].deviceIdsJson)
      ? vaultRows[0].deviceIdsJson
      : [];
    const nextDeviceIds = Array.from(
      new Set([...existing, payload.deviceId])
    );

    await db
      .update(obsidianVaults)
      .set({
        deviceIdsJson: nextDeviceIds,
      })
      .where(eq(obsidianVaults.vaultId, payload.vaultId));
  }

  await db
    .update(obsidianVaults)
    .set({
      lastSeenAt: now,
      updatedAt: now,
    })
    .where(eq(obsidianVaults.vaultId, payload.vaultId));

  return c.json({
    accepted,
    rejected,
    itemResults,
  } satisfies SyncBatchResponse);
});
