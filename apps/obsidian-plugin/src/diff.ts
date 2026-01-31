import type { FileIndexEntry, SyncInterval } from "./types";

export type VaultFile = {
	path: string;
	mtime: number;
};

export type DiffResult = {
	toUpsert: VaultFile[];
	toDelete: { externalId: string; path: string }[];
	unchanged: number;
};

/**
 * Compute what needs to sync by comparing vault state vs index.
 *
 * - NEW: file in vault but not in index → upsert
 * - MODIFIED: file.mtime > index.lastSyncedAt → upsert
 * - DELETED: file in index but not in vault → delete
 * - UNCHANGED: file in both, mtime <= lastSyncedAt → skip
 */
export function computeSyncDiff(
	vaultFiles: VaultFile[],
	index: Record<string, FileIndexEntry>,
	buildExternalId: (path: string) => string,
): DiffResult {
	const toUpsert: VaultFile[] = [];
	const toDelete: { externalId: string; path: string }[] = [];
	let unchanged = 0;

	const seenExternalIds = new Set<string>();

	for (const file of vaultFiles) {
		const externalId = buildExternalId(file.path);
		seenExternalIds.add(externalId);

		const indexed = index[externalId];

		if (!indexed) {
			toUpsert.push(file);
		} else if (file.mtime > indexed.lastSyncedAt) {
			toUpsert.push(file);
		} else {
			unchanged++;
		}
	}

	for (const [externalId, entry] of Object.entries(index)) {
		if (!seenExternalIds.has(externalId)) {
			toDelete.push({ externalId, path: entry.path });
		}
	}

	return { toUpsert, toDelete, unchanged };
}

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

/**
 * Determine if a sync should run based on interval settings.
 */
export function shouldSyncNow(
	lastSyncAt: number | null,
	interval: SyncInterval,
	now: number = Date.now(),
): boolean {
	if (interval === "manual") {
		return false;
	}

	if (lastSyncAt === null) {
		return true;
	}

	const elapsed = now - lastSyncAt;

	if (interval === "daily") {
		return elapsed >= DAY_MS;
	}

	if (interval === "weekly") {
		return elapsed >= WEEK_MS;
	}

	return false;
}
