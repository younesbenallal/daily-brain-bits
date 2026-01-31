import { normalizeForHash, sha256Hex } from "@daily-brain-bits/core";
import { buildExternalId, type SyncBatchResponse, type SyncItem } from "@daily-brain-bits/integrations-obsidian";
import { type App, getAllTags, TFile } from "obsidian";
import type { DiffResult, VaultFile } from "./diff";
import type { RPCClient } from "./rpc-client";
import type { DBBSettings } from "./settings";
import { extractAliases, pickFrontmatter, shouldSyncFile } from "./sync-utils";
import type { LocalIndex, SyncStatus } from "./types";

export class SyncOperations {
	private app: App;
	private settings: DBBSettings;
	private index: LocalIndex;
	private status: SyncStatus;
	private rpcClient: RPCClient;
	private isSyncing = false;

	constructor(
		app: App,
		settings: DBBSettings,
		index: LocalIndex,
		status: SyncStatus,
		rpcClient: RPCClient,
	) {
		this.app = app;
		this.settings = settings;
		this.index = index;
		this.status = status;
		this.rpcClient = rpcClient;
	}

	updateSettings(settings: DBBSettings) {
		this.settings = settings;
	}

	async connect() {
		if (!this.settings.apiBaseUrl || !this.settings.vaultId) {
			this.status.lastError = "missing_settings";
			return;
		}
		if (!this.settings.pluginToken) {
			this.status.lastError = "missing_token";
			return;
		}

		const response = await this.rpcClient.connect(this.settings.vaultId, this.app.vault.getName(), this.settings.deviceId);

		if (!response) {
			this.status.lastError = this.rpcClient.getLastError() ?? "connect_failed";
			return;
		}

		this.status.lastSyncAt = new Date().toISOString();
		this.status.lastResult = { accepted: 0, rejected: 0 };
		this.status.lastError = null;
	}

	async performSync(diff: DiffResult, pathFilter: (path: string) => boolean): Promise<{ accepted: number; rejected: number } | null> {
		if (this.isSyncing) {
			return null;
		}

		this.isSyncing = true;
		let totalAccepted = 0;
		let totalRejected = 0;

		try {
			// Process upserts in batches
			const upsertBatches = this.chunkArray(diff.toUpsert, this.settings.batchSize);

			for (const batch of upsertBatches) {
				const result = await this.processUpsertBatch(batch, pathFilter);
				if (result) {
					totalAccepted += result.accepted;
					totalRejected += result.rejected;
				}
			}

			// Process deletes in batches
			const deleteBatches = this.chunkArray(diff.toDelete, this.settings.batchSize);

			for (const batch of deleteBatches) {
				const result = await this.processDeleteBatch(batch);
				if (result) {
					totalAccepted += result.accepted;
					totalRejected += result.rejected;
				}
			}

			// Signal sync complete
			await this.signalSyncComplete();

			return { accepted: totalAccepted, rejected: totalRejected };
		} finally {
			this.isSyncing = false;
		}
	}

	private async processUpsertBatch(
		files: VaultFile[],
		pathFilter: (path: string) => boolean,
	): Promise<{ accepted: number; rejected: number } | null> {
		const items: SyncItem[] = [];
		const itemMap = new Map<string, { item: SyncItem; file: VaultFile }>();

		// Build items
		const buildResults = await Promise.all(
			files.map(async (file) => {
				const item = await this.buildUpsertItem(file, pathFilter);
				return { file, item };
			}),
		);

		// Apply byte limit
		let batchBytes = 0;
		for (const { file, item } of buildResults) {
			if (!item) {
				continue;
			}

			const projectedBytes = Buffer.byteLength(JSON.stringify(item), "utf8");
			const wouldOverflow = items.length > 0 && projectedBytes + batchBytes > this.settings.maxBytesPerBatch;

			if (wouldOverflow) {
				break;
			}

			items.push(item);
			itemMap.set(item.externalId, { item, file });
			batchBytes += projectedBytes;
		}

		if (items.length === 0) {
			return { accepted: 0, rejected: 0 };
		}

		// Send batch
		const response = await this.rpcClient.sendBatch(
			this.settings.vaultId,
			this.app.vault.getName(),
			this.settings.deviceId,
			items,
		);

		if (!response) {
			this.status.lastError = this.rpcClient.getLastError() ?? "sync_failed";
			return null;
		}

		// Update index for accepted items
		this.applyUpsertResults(response, itemMap);

		return { accepted: response.accepted, rejected: response.rejected };
	}

	private async processDeleteBatch(
		deletes: { externalId: string; path: string }[],
	): Promise<{ accepted: number; rejected: number } | null> {
		const items: SyncItem[] = deletes.map((d) => ({
			op: "delete" as const,
			externalId: d.externalId,
			deletedAtSource: new Date().toISOString(),
			metadata: { path: d.path },
		}));

		if (items.length === 0) {
			return { accepted: 0, rejected: 0 };
		}

		const response = await this.rpcClient.sendBatch(
			this.settings.vaultId,
			this.app.vault.getName(),
			this.settings.deviceId,
			items,
		);

		if (!response) {
			this.status.lastError = this.rpcClient.getLastError() ?? "sync_failed";
			return null;
		}

		// Remove accepted deletes from index
		for (const result of response.itemResults) {
			if (result.status === "accepted") {
				delete this.index.files[result.externalId];
			}
		}

		return { accepted: response.accepted, rejected: response.rejected };
	}

	private async buildUpsertItem(vaultFile: VaultFile, pathFilter: (path: string) => boolean): Promise<SyncItem | null> {
		const file = this.app.vault.getAbstractFileByPath(vaultFile.path);
		if (!(file instanceof TFile)) {
			return null;
		}

		if (!shouldSyncFile(file, pathFilter)) {
			return null;
		}

		const externalId = buildExternalId(this.settings.vaultId, file.path);
		const content = await this.app.vault.cachedRead(file);
		const contentHash = sha256Hex(normalizeForHash(content));

		// Skip if content hasn't changed (mtime changed but content same)
		const existing = this.index.files[externalId];
		if (existing && existing.contentHash === contentHash) {
			// Update lastSyncedAt to current mtime so we don't reprocess
			this.index.files[externalId] = {
				...existing,
				lastSyncedAt: file.stat.mtime,
			};
			return null;
		}

		const cache = this.app.metadataCache.getFileCache(file);
		const frontmatter = pickFrontmatter(cache?.frontmatter);
		const tags = cache ? getAllTags(cache) : [];
		const aliases = extractAliases(cache?.frontmatter);
		const links = cache?.links?.map((link) => link.link) ?? [];
		const title = typeof cache?.frontmatter?.title === "string" ? cache.frontmatter.title : file.basename;

		return {
			op: "upsert",
			externalId,
			title,
			contentMarkdown: content,
			contentHash,
			updatedAtSource: new Date(file.stat.mtime).toISOString(),
			metadata: {
				path: file.path,
				tags,
				aliases,
				links,
				frontmatter,
			},
		};
	}

	private applyUpsertResults(
		response: SyncBatchResponse,
		itemMap: Map<string, { item: SyncItem; file: VaultFile }>,
	) {
		for (const result of response.itemResults) {
			if (result.status !== "accepted") {
				continue;
			}

			const entry = itemMap.get(result.externalId);
			if (!entry || entry.item.op !== "upsert") {
				continue;
			}

			const { item, file } = entry;
			const path = item.metadata && typeof item.metadata.path === "string" ? item.metadata.path : file.path;

			this.index.files[item.externalId] = {
				path,
				contentHash: item.contentHash,
				lastSyncedAt: file.mtime,
			};
		}
	}

	private async signalSyncComplete() {
		if (!this.settings.vaultId) {
			return;
		}
		await this.rpcClient.signalSyncComplete(this.settings.vaultId);
	}

	private chunkArray<T>(array: T[], size: number): T[][] {
		const chunks: T[][] = [];
		for (let i = 0; i < array.length; i += size) {
			chunks.push(array.slice(i, i + size));
		}
		return chunks;
	}
}
