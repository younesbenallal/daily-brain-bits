import type { SyncCursor } from "@daily-brain-bits/core";
import { db, integrationScopeItems } from "@daily-brain-bits/db";
import { createPathFilter } from "@daily-brain-bits/integrations-obsidian";
import type { IntegrationKind } from "@daily-brain-bits/types";
import { and, eq } from "drizzle-orm";
import { type IngestResult, ingestSyncItems } from "./ingest";

type ScopeFilterResult = {
  filteredItems: unknown[];
  rejected: number;
  itemResults: IngestResult["itemResults"];
};

export type SyncPipelineParams = {
  connectionId: number;
  userId: string;
  items: unknown[];
  receivedAt: Date;
  sourceKind: IntegrationKind;
  nextCursor?: SyncCursor | null;
  defaultDeletedAtSource?: string | null;
};

function fallbackTitle(path: string): string {
  const parts = path.split("/");
  const last = parts[parts.length - 1] || path;
  return last.replace(/\.md$/i, "");
}

async function filterObsidianItems(
  connectionId: number,
  items: unknown[],
  defaultDeletedAtSource: string
): Promise<ScopeFilterResult> {
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
  const itemResults: IngestResult["itemResults"] = [];
  let rejected = 0;

  for (const item of items) {
    const itemRecord = typeof item === "object" && item ? (item as Record<string, unknown>) : null;
    const path =
      itemRecord &&
      "metadata" in itemRecord &&
      typeof (itemRecord as { metadata?: { path?: unknown } }).metadata?.path === "string"
        ? (itemRecord as { metadata: { path: string } }).metadata.path
        : null;

    if (!path) {
      rejected += 1;
      itemResults.push({
        externalId:
          itemRecord && "externalId" in itemRecord && typeof (itemRecord as { externalId?: unknown }).externalId === "string"
            ? (itemRecord as { externalId: string }).externalId
            : "unknown",
        status: "rejected",
        reason: "missing_path",
      });
      continue;
    }

    if (!allowAll && !pathFilter(path)) {
      rejected += 1;
      itemResults.push({
        externalId:
          itemRecord && "externalId" in itemRecord && typeof (itemRecord as { externalId?: unknown }).externalId === "string"
            ? (itemRecord as { externalId: string }).externalId
            : "unknown",
        status: "rejected",
        reason: "out_of_scope",
      });
      continue;
    }

    if (itemRecord && "op" in itemRecord && itemRecord.op === "upsert") {
      filteredItems.push({
        ...itemRecord,
        title: typeof itemRecord.title === "string" ? (itemRecord.title as string) : fallbackTitle(path),
        metadata: {
          ...((itemRecord.metadata && typeof itemRecord.metadata === "object" && !Array.isArray(itemRecord.metadata)
            ? itemRecord.metadata
            : {}) as Record<string, unknown>),
          path,
        },
      });
      continue;
    }

    const safeRecord = itemRecord ?? {};
    filteredItems.push({
      ...safeRecord,
      deletedAtSource:
        typeof safeRecord.deletedAtSource === "string" ? (safeRecord.deletedAtSource as string) : defaultDeletedAtSource,
      metadata: {
        ...((itemRecord?.metadata && typeof itemRecord.metadata === "object" && !Array.isArray(itemRecord.metadata)
          ? itemRecord.metadata
          : {}) as Record<string, unknown>),
        path,
      },
    });
  }

  return { filteredItems, rejected, itemResults };
}

async function applyScopeFilter(
  params: Pick<SyncPipelineParams, "connectionId" | "items" | "sourceKind" | "defaultDeletedAtSource" | "receivedAt">
): Promise<ScopeFilterResult> {
  if (params.sourceKind !== "obsidian") {
    return { filteredItems: params.items, rejected: 0, itemResults: [] };
  }

  const fallbackDeletedAtSource = params.defaultDeletedAtSource ?? params.receivedAt.toISOString();
  return filterObsidianItems(params.connectionId, params.items, fallbackDeletedAtSource);
}

export async function runSyncPipeline(params: SyncPipelineParams): Promise<IngestResult> {
  const { filteredItems, rejected, itemResults } = await applyScopeFilter({
    connectionId: params.connectionId,
    items: params.items,
    sourceKind: params.sourceKind,
    defaultDeletedAtSource: params.defaultDeletedAtSource ?? null,
    receivedAt: params.receivedAt,
  });

  const ingestResult = await ingestSyncItems({
    connectionId: params.connectionId,
    userId: params.userId,
    items: filteredItems,
    receivedAt: params.receivedAt,
    nextCursor: params.nextCursor,
  });

  return {
    accepted: ingestResult.accepted,
    rejected: ingestResult.rejected + rejected,
    skipped: ingestResult.skipped,
    itemResults: [...itemResults, ...ingestResult.itemResults],
  };
}
