import type { IntegrationSyncAdapter, SyncItem } from "@daily-brain-bits/core";
import type { SyncItem as ObsidianSyncItem } from "./sync";

export type ObsidianSyncScope = {
  vaultId: string;
};

export type ObsidianSyncAdapter = IntegrationSyncAdapter<ObsidianSyncScope>;

export function toCoreSyncItem(item: ObsidianSyncItem): SyncItem {
  const metadata = {
    path: item.path,
    ...(item.metadata ?? {}),
  };

  if (item.op === "upsert") {
    return {
      op: "upsert",
      externalId: item.externalId,
      title: item.title,
      contentMarkdown: item.contentMarkdown,
      contentHash: item.contentHash,
      updatedAtSource: item.updatedAtSource ?? null,
      deletedAtSource: null,
      metadata,
    };
  }

  return {
    op: "delete",
    externalId: item.externalId,
    title: item.title,
    updatedAtSource: item.updatedAtSource ?? null,
    deletedAtSource: item.updatedAtSource ?? null,
    metadata,
  };
}
