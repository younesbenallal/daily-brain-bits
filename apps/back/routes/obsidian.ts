import { createHash } from "node:crypto";
import { db, integrationConnections, integrationScopeItems, obsidianVaults } from "@daily-brain-bits/db";
import {
  obsidianRegisterResponseSchema,
  obsidianScopeResponseSchema,
  syncBatchRequestSchema,
  syncBatchResponseSchema,
} from "@daily-brain-bits/integrations-obsidian";
import { ORPCError, os } from "@orpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { runSyncPipeline } from "../integrations/sync-pipeline";

const registerRequestSchema = z.object({
  userId: z.string().min(1),
  displayName: z.string().min(1).optional(),
});

const base = os.$context<{ requestUrl: string }>();

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

const register = base
  .input(registerRequestSchema)
  .output(obsidianRegisterResponseSchema)
  .handler(async ({ input, context }) => {
    console.log("[obsidian.register] start", { userId: input.userId, displayName: input.displayName ?? null });
    const vaultId = crypto.randomUUID();
    const pluginToken = crypto.randomUUID();
    const apiBaseUrl = new URL(context.requestUrl).origin;

    const [connection] = await db
      .insert(integrationConnections)
      .values({
        userId: input.userId,
        kind: "obsidian",
        status: "active",
        displayName: input.displayName ?? "Obsidian Vault",
        accountExternalId: vaultId,
        configJson: {
          vaultId,
        },
        secretsJsonEncrypted: null,
      })
      .returning({
        id: integrationConnections.id,
      });

    const connectionId = connection?.id;
    if (!connectionId) {
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: "failed_to_create_connection",
      });
    }

    await db.insert(obsidianVaults).values({
      vaultId,
      userId: input.userId,
      connectionId,
      pluginTokenHash: hashToken(pluginToken),
      deviceIdsJson: [],
      settingsJson: {},
    });

    console.log("[obsidian.register] created", { userId: input.userId, vaultId, connectionId });

    return {
      pluginToken,
      vaultId,
      apiBaseUrl,
      connectionId,
    };
  });

const scope = base
  .input(
    z.object({
      vaultId: z.string().min(1),
    })
  )
  .output(obsidianScopeResponseSchema)
  .handler(async ({ input }) => {
    console.log("[obsidian.scope] start", { vaultId: input.vaultId });
    const connection = await db
      .select({
        id: integrationConnections.id,
      })
      .from(integrationConnections)
      .where(
        and(eq(integrationConnections.kind, "obsidian"), eq(integrationConnections.accountExternalId, input.vaultId))
      )
      .limit(1);

    const connectionId = connection[0]?.id;
    if (!connectionId) {
      throw new ORPCError("NOT_FOUND", {
        message: "unknown_vault",
      });
    }

    const scopeItems = await db
      .select({
        value: integrationScopeItems.scopeValue,
        updatedAt: integrationScopeItems.updatedAt,
      })
      .from(integrationScopeItems)
      .where(
        and(
          eq(integrationScopeItems.connectionId, connectionId),
          eq(integrationScopeItems.scopeType, "obsidian_glob"),
          eq(integrationScopeItems.enabled, true)
        )
      );

    const updatedAt = scopeItems.reduce<string | undefined>((max, item) => {
      const value = item.updatedAt?.toISOString();
      if (!value) {
        return max;
      }
      if (!max || value > max) {
        return value;
      }
      return max;
    }, undefined);

    console.log("[obsidian.scope] resolved", {
      vaultId: input.vaultId,
      connectionId,
      patternCount: scopeItems.length,
    });

    return {
      vaultId: input.vaultId,
      patterns: scopeItems.map((item) => item.value),
      updatedAt,
    };
  });

const syncBatch = base
  .input(syncBatchRequestSchema)
  .output(syncBatchResponseSchema)
  .handler(async ({ input }) => {
    console.log("[obsidian.sync] start", {
      vaultId: input.vaultId,
      deviceId: input.deviceId,
      itemCount: input.items.length,
      sentAt: input.sentAt,
    });
    const connection = await db
      .select({
        id: integrationConnections.id,
        userId: integrationConnections.userId,
      })
      .from(integrationConnections)
      .where(and(eq(integrationConnections.kind, "obsidian"), eq(integrationConnections.accountExternalId, input.vaultId)))
      .limit(1);

    const connectionId = connection[0]?.id;
    const userId = connection[0]?.userId;
    if (!connectionId || !userId) {
      throw new ORPCError("NOT_FOUND", {
        message: "unknown_vault",
      });
    }

    const now = new Date();
    const ingestResult = await runSyncPipeline({
      connectionId,
      userId,
      items: input.items,
      receivedAt: now,
      sourceKind: "obsidian",
      defaultDeletedAtSource: input.sentAt,
    });

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
      .where(eq(obsidianVaults.vaultId, input.vaultId))
      .limit(1);

    if (input.deviceId && vaultRows.length > 0) {
      const existing = Array.isArray(vaultRows[0]?.deviceIdsJson) ? vaultRows[0]?.deviceIdsJson : [];
      const nextDeviceIds = Array.from(new Set([...existing, input.deviceId]));

      await db
        .update(obsidianVaults)
        .set({
          deviceIdsJson: nextDeviceIds,
        })
        .where(eq(obsidianVaults.vaultId, input.vaultId));
    }

    await db
      .update(obsidianVaults)
      .set({
        lastSeenAt: now,
        updatedAt: now,
      })
      .where(eq(obsidianVaults.vaultId, input.vaultId));

    console.log("[obsidian.sync] done", {
      vaultId: input.vaultId,
      connectionId,
      accepted: ingestResult.accepted,
      rejected: ingestResult.rejected,
      skipped: ingestResult.skipped,
    });

    return {
      accepted: ingestResult.accepted,
      rejected: ingestResult.rejected,
      itemResults: ingestResult.itemResults,
    };
  });

export const obsidianRouter = {
  register,
  scope,
  sync: {
    batch: syncBatch,
  },
};
