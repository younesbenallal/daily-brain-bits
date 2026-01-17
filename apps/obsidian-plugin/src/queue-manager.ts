import { toQueueKey } from "./sync-utils";
import type { LocalIndex, PendingQueueItem } from "./types";

export class QueueManager {
	private index: LocalIndex;
	private saveData: () => Promise<void>;

	constructor(index: LocalIndex, saveData: () => Promise<void>) {
		this.index = index;
		this.saveData = saveData;
	}

	enqueue(item: PendingQueueItem) {
		const key = toQueueKey(item);
		const existing = new Set(this.index.pendingQueue.map((entry) => toQueueKey(entry)));
		if (existing.has(key)) {
			return;
		}
		this.index.pendingQueue.push(item);
		void this.saveData();
	}

	dropQueueItems(keys: Set<string>) {
		if (keys.size === 0) {
			return;
		}
		this.index.pendingQueue = this.index.pendingQueue.filter((item) => !keys.has(toQueueKey(item)));
	}

	getQueueLength(): number {
		return this.index.pendingQueue.length;
	}

	getPendingQueue(): PendingQueueItem[] {
		return this.index.pendingQueue;
	}
}
