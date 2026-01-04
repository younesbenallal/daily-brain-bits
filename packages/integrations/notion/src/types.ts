export type NotionSyncItem = {
  externalId: string;
  title: string;
  contentMarkdown: string;
  contentHash: string;
  createdAtSource: string | null;
  updatedAtSource: string | null;
  deletedAtSource: string | null;
  metadata: Record<string, unknown> | null;
};

export type NotionSyncStats = {
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
  items: NotionSyncItem[];
  errors: NotionSyncError[];
  stats: NotionSyncStats;
  stoppedEarly: boolean;
};

export type NotionSyncProgress = {
  databaseId: string;
  pageId: string;
  lastEditedAt?: string;
};

export type NotionSyncOptions = {
  since?: Date;
  safetyMarginMinutes?: number;
  pageSize?: number;
  maxPages?: number;
  onPage?: (progress: NotionSyncProgress) => void;
  request?: NotionRequest;
};

export type NotionRequest = <T>(fn: () => Promise<T>) => Promise<T>;
