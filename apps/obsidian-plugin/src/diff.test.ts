import { describe, expect, test } from "bun:test";
import { computeSyncDiff, shouldSyncNow, type VaultFile } from "./diff";
import type { FileIndexEntry } from "./types";

const buildExternalId = (path: string) => `vault123::${path}`;

describe("computeSyncDiff", () => {
	test("empty vault and empty index returns nothing to sync", () => {
		const result = computeSyncDiff([], {}, buildExternalId);

		expect(result.toUpsert).toEqual([]);
		expect(result.toDelete).toEqual([]);
		expect(result.unchanged).toBe(0);
	});

	test("new files only - all go to toUpsert", () => {
		const vaultFiles: VaultFile[] = [
			{ path: "note-a.md", mtime: 1000 },
			{ path: "note-b.md", mtime: 2000 },
		];

		const result = computeSyncDiff(vaultFiles, {}, buildExternalId);

		expect(result.toUpsert).toEqual(vaultFiles);
		expect(result.toDelete).toEqual([]);
		expect(result.unchanged).toBe(0);
	});

	test("all files unchanged - nothing to sync", () => {
		const vaultFiles: VaultFile[] = [
			{ path: "note-a.md", mtime: 1000 },
			{ path: "note-b.md", mtime: 2000 },
		];

		const index: Record<string, FileIndexEntry> = {
			"vault123::note-a.md": { path: "note-a.md", contentHash: "hash-a", lastSyncedAt: 1000 },
			"vault123::note-b.md": { path: "note-b.md", contentHash: "hash-b", lastSyncedAt: 2000 },
		};

		const result = computeSyncDiff(vaultFiles, index, buildExternalId);

		expect(result.toUpsert).toEqual([]);
		expect(result.toDelete).toEqual([]);
		expect(result.unchanged).toBe(2);
	});

	test("modified files - mtime > lastSyncedAt goes to toUpsert", () => {
		const vaultFiles: VaultFile[] = [
			{ path: "note-a.md", mtime: 5000 }, // modified
			{ path: "note-b.md", mtime: 2000 }, // unchanged
		];

		const index: Record<string, FileIndexEntry> = {
			"vault123::note-a.md": { path: "note-a.md", contentHash: "hash-a", lastSyncedAt: 1000 },
			"vault123::note-b.md": { path: "note-b.md", contentHash: "hash-b", lastSyncedAt: 2000 },
		};

		const result = computeSyncDiff(vaultFiles, index, buildExternalId);

		expect(result.toUpsert).toEqual([{ path: "note-a.md", mtime: 5000 }]);
		expect(result.toDelete).toEqual([]);
		expect(result.unchanged).toBe(1);
	});

	test("deleted files - in index but not in vault goes to toDelete", () => {
		const vaultFiles: VaultFile[] = [{ path: "note-a.md", mtime: 1000 }];

		const index: Record<string, FileIndexEntry> = {
			"vault123::note-a.md": { path: "note-a.md", contentHash: "hash-a", lastSyncedAt: 1000 },
			"vault123::note-b.md": { path: "note-b.md", contentHash: "hash-b", lastSyncedAt: 2000 },
		};

		const result = computeSyncDiff(vaultFiles, index, buildExternalId);

		expect(result.toUpsert).toEqual([]);
		expect(result.toDelete).toEqual([{ externalId: "vault123::note-b.md", path: "note-b.md" }]);
		expect(result.unchanged).toBe(1);
	});

	test("mixed scenario - new, modified, deleted, unchanged", () => {
		const vaultFiles: VaultFile[] = [
			{ path: "new-note.md", mtime: 3000 }, // new
			{ path: "modified.md", mtime: 5000 }, // modified (was 1000)
			{ path: "unchanged.md", mtime: 2000 }, // unchanged
		];

		const index: Record<string, FileIndexEntry> = {
			"vault123::modified.md": { path: "modified.md", contentHash: "hash-m", lastSyncedAt: 1000 },
			"vault123::unchanged.md": { path: "unchanged.md", contentHash: "hash-u", lastSyncedAt: 2000 },
			"vault123::deleted.md": { path: "deleted.md", contentHash: "hash-d", lastSyncedAt: 1500 },
		};

		const result = computeSyncDiff(vaultFiles, index, buildExternalId);

		expect(result.toUpsert).toHaveLength(2);
		expect(result.toUpsert).toContainEqual({ path: "new-note.md", mtime: 3000 });
		expect(result.toUpsert).toContainEqual({ path: "modified.md", mtime: 5000 });
		expect(result.toDelete).toEqual([{ externalId: "vault123::deleted.md", path: "deleted.md" }]);
		expect(result.unchanged).toBe(1);
	});

	test("rename appears as delete old + new file", () => {
		// User renamed "old-name.md" to "new-name.md"
		const vaultFiles: VaultFile[] = [{ path: "new-name.md", mtime: 3000 }];

		const index: Record<string, FileIndexEntry> = {
			"vault123::old-name.md": { path: "old-name.md", contentHash: "hash-x", lastSyncedAt: 1000 },
		};

		const result = computeSyncDiff(vaultFiles, index, buildExternalId);

		expect(result.toUpsert).toEqual([{ path: "new-name.md", mtime: 3000 }]);
		expect(result.toDelete).toEqual([{ externalId: "vault123::old-name.md", path: "old-name.md" }]);
		expect(result.unchanged).toBe(0);
	});

	test("file with same mtime as lastSyncedAt is unchanged", () => {
		const vaultFiles: VaultFile[] = [{ path: "note.md", mtime: 1000 }];

		const index: Record<string, FileIndexEntry> = {
			"vault123::note.md": { path: "note.md", contentHash: "hash", lastSyncedAt: 1000 },
		};

		const result = computeSyncDiff(vaultFiles, index, buildExternalId);

		expect(result.toUpsert).toEqual([]);
		expect(result.toDelete).toEqual([]);
		expect(result.unchanged).toBe(1);
	});
});

describe("shouldSyncNow", () => {
	const DAY = 24 * 60 * 60 * 1000;
	const WEEK = 7 * DAY;

	test("manual interval - always returns false", () => {
		expect(shouldSyncNow(null, "manual")).toBe(false);
		expect(shouldSyncNow(0, "manual")).toBe(false);
		expect(shouldSyncNow(Date.now() - WEEK * 10, "manual")).toBe(false);
	});

	test("never synced (null) - returns true for daily/weekly", () => {
		expect(shouldSyncNow(null, "daily")).toBe(true);
		expect(shouldSyncNow(null, "weekly")).toBe(true);
	});

	test("daily - synced 2 hours ago - returns false", () => {
		const now = Date.now();
		const twoHoursAgo = now - 2 * 60 * 60 * 1000;

		expect(shouldSyncNow(twoHoursAgo, "daily", now)).toBe(false);
	});

	test("daily - synced 25 hours ago - returns true", () => {
		const now = Date.now();
		const twentyFiveHoursAgo = now - 25 * 60 * 60 * 1000;

		expect(shouldSyncNow(twentyFiveHoursAgo, "daily", now)).toBe(true);
	});

	test("daily - synced exactly 24 hours ago - returns true", () => {
		const now = Date.now();
		const exactlyOneDay = now - DAY;

		expect(shouldSyncNow(exactlyOneDay, "daily", now)).toBe(true);
	});

	test("weekly - synced 3 days ago - returns false", () => {
		const now = Date.now();
		const threeDaysAgo = now - 3 * DAY;

		expect(shouldSyncNow(threeDaysAgo, "weekly", now)).toBe(false);
	});

	test("weekly - synced 8 days ago - returns true", () => {
		const now = Date.now();
		const eightDaysAgo = now - 8 * DAY;

		expect(shouldSyncNow(eightDaysAgo, "weekly", now)).toBe(true);
	});

	test("weekly - synced exactly 7 days ago - returns true", () => {
		const now = Date.now();
		const exactlyOneWeek = now - WEEK;

		expect(shouldSyncNow(exactlyOneWeek, "weekly", now)).toBe(true);
	});
});
