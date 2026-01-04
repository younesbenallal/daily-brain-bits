import type { SyncCursor, SyncItem, SyncStats } from "@daily-brain-bits/core";

export type NotionSyncStats = SyncStats & {
  pagesVisited: number;
  pagesSynced: number;
  pagesSkipped: number;
};

export type NotionSyncError = {
  pageId?: string;
  message: string;
  code?: string;
};

export type NotionSyncResult = {
  items: SyncItem[];
  nextCursor: SyncCursor;
  errors: NotionSyncError[];
  stats: NotionSyncStats;
};

export type NotionSyncProgress = {
  databaseId: string;
  pageId: string;
  lastEditedAt?: string;
};

export type NotionSyncOptions = {
  cursor?: SyncCursor;
  safetyMarginSeconds?: number;
  pageSize?: number;
  maxPages?: number;
  onPage?: (progress: NotionSyncProgress) => void;
  request?: NotionRequest;
};

export type NotionRequest = <T>(fn: () => Promise<T>) => Promise<T>;
