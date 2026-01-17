import type { LocalIndex, PendingQueueItem } from "./types";
import { DEFAULT_SETTINGS, normalizeSettings, type DBBSettings } from "./settings";

export type PluginData = {
	settings: DBBSettings;
	index: LocalIndex;
};

export const DEFAULT_INDEX: LocalIndex = {
	files: {},
	pendingQueue: [],
	lastFullScanAt: null,
};

function normalizeQueue(queue: PendingQueueItem[] | undefined): PendingQueueItem[] {
	if (!Array.isArray(queue)) {
		return [];
	}
	return queue
		.map((item) => ({
			op: item.op,
			externalId: item.externalId,
			path: item.path,
			lastSeenMtime: item.lastSeenMtime ?? null,
		}))
		.filter((item) => item.op && item.externalId && item.path);
}

function normalizeIndex(value?: Partial<LocalIndex> | null): LocalIndex {
	return {
		files: value?.files ?? {},
		pendingQueue: normalizeQueue(value?.pendingQueue),
		lastFullScanAt: value?.lastFullScanAt ?? null,
	};
}

export function mergePluginData(raw: unknown): PluginData {
	const data = (raw && typeof raw === "object" ? raw : {}) as Partial<PluginData>;

	return {
		settings: normalizeSettings(data.settings ?? DEFAULT_SETTINGS),
		index: normalizeIndex(data.index),
	};
}
