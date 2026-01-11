import type { SyncItem, SyncStats } from "@daily-brain-bits/core";
import { z } from "zod/v4";

export const notionSyncCursorSchema = z.object({
  since: z.string().datetime(),
});

export type NotionSyncCursor = z.infer<typeof notionSyncCursorSchema>;

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
  nextCursor: NotionSyncCursor;
  errors: NotionSyncError[];
  stats: NotionSyncStats;
};

export type NotionSyncProgress = {
  databaseId: string;
  pageId: string;
  lastEditedAt?: string;
};

export type NotionSyncOptions = {
  cursor?: NotionSyncCursor;
  safetyMarginSeconds?: number;
  pageSize?: number;
  maxPages?: number;
  onPage?: (progress: NotionSyncProgress) => void;
  request?: NotionRequest;
};

export type NotionRequest = <T>(fn: () => Promise<T>) => Promise<T>;
