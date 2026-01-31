import type { FileIndexEntry, LocalIndex } from "./types";
import { DEFAULT_SETTINGS, normalizeSettings, type DBBSettings } from "./settings";

export type PluginData = {
	settings: DBBSettings;
	index: LocalIndex;
};

export const DEFAULT_INDEX: LocalIndex = {
	files: {},
	lastSyncAt: null,
};

type LegacyFileIndexEntry = {
	path: string;
	contentHash: string;
	lastSyncedAt: string | null;
	lastSeenMtime?: number | null;
};

type LegacyLocalIndex = {
	files?: Record<string, LegacyFileIndexEntry>;
	pendingQueue?: unknown[];
	lastFullScanAt?: string | null;
	lastSyncAt?: number | null;
};

function parseTimestamp(value: string | number | null | undefined): number | null {
	if (value === null || value === undefined) {
		return null;
	}
	if (typeof value === "number") {
		return value;
	}
	const parsed = Date.parse(value);
	return Number.isNaN(parsed) ? null : parsed;
}

function migrateFileEntry(entry: LegacyFileIndexEntry): FileIndexEntry | null {
	if (!entry.path || !entry.contentHash) {
		return null;
	}

	const lastSyncedAt = parseTimestamp(entry.lastSyncedAt) ?? parseTimestamp(entry.lastSeenMtime) ?? Date.now();

	return {
		path: entry.path,
		contentHash: entry.contentHash,
		lastSyncedAt,
	};
}

function normalizeIndex(value?: LegacyLocalIndex | null): LocalIndex {
	if (!value) {
		return DEFAULT_INDEX;
	}

	const files: Record<string, FileIndexEntry> = {};

	if (value.files && typeof value.files === "object") {
		for (const [key, entry] of Object.entries(value.files)) {
			const migrated = migrateFileEntry(entry);
			if (migrated) {
				files[key] = migrated;
			}
		}
	}

	// Migrate lastSyncAt: prefer new format, fall back to lastFullScanAt
	const lastSyncAt = value.lastSyncAt ?? parseTimestamp(value.lastFullScanAt);

	return {
		files,
		lastSyncAt,
	};
}

export function mergePluginData(raw: unknown): PluginData {
	const data = (raw && typeof raw === "object" ? raw : {}) as Partial<PluginData> & { index?: LegacyLocalIndex };

	return {
		settings: normalizeSettings(data.settings ?? DEFAULT_SETTINGS),
		index: normalizeIndex(data.index),
	};
}
