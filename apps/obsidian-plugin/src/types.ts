export type SyncInterval = "daily" | "weekly" | "manual";

// Legacy types - kept for migration, will be removed
export type QueueOp = "upsert" | "delete";
export type PendingQueueItem = {
	op: QueueOp;
	externalId: string;
	path: string;
	lastSeenMtime?: number | null;
};

export type FileIndexEntry = {
	path: string;
	contentHash: string;
	lastSyncedAt: number;
};

export type LocalIndex = {
	files: Record<string, FileIndexEntry>;
	lastSyncAt: number | null;
};

export type SyncStatus = {
	lastSyncAt: string | null;
	lastError: string | null;
	lastResult: { accepted: number; rejected: number } | null;
};
