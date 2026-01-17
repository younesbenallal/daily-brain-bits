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
	lastSyncedAt: string | null;
	lastSeenMtime: number | null;
};

export type LocalIndex = {
	files: Record<string, FileIndexEntry>;
	pendingQueue: PendingQueueItem[];
	lastFullScanAt: string | null;
};

export type SyncStatus = {
	lastSyncAt: string | null;
	lastError: string | null;
	lastResult: { accepted: number; rejected: number } | null;
};
