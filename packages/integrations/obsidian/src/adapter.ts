import type { IntegrationSyncAdapter, SyncItem } from "@daily-brain-bits/core";
import type { SyncItem as ObsidianSyncItem } from "./sync";

export type ObsidianSyncScope = {
  vaultId: string;
};

export type ObsidianSyncAdapter = IntegrationSyncAdapter<ObsidianSyncScope>;

export function toCoreSyncItem(item: ObsidianSyncItem): SyncItem {
  return {
    ...item,
    metadata: item.metadata ?? null,
  };
}
