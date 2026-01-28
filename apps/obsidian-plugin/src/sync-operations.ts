import { normalizeForHash, sha256Hex } from "@daily-brain-bits/core";
import { buildExternalId, type SyncBatchResponse, type SyncItem } from "@daily-brain-bits/integrations-obsidian";
import { type App, getAllTags, TFile } from "obsidian";
import type { QueueManager } from "./queue-manager";
import type { RPCClient } from "./rpc-client";
import type { DBBSettings } from "./settings";
import { extractAliases, pickFrontmatter, shouldSyncFile, toQueueKey } from "./sync-utils";
import type { LocalIndex, PendingQueueItem, SyncStatus } from "./types";

export class SyncOperations {
	private app: App;
	private settings: DBBSettings;
	private index: LocalIndex;
	private status: SyncStatus;
	private queueManager: QueueManager;
	private rpcClient: RPCClient;
	private saveData: () => Promise<void>;
	private isSyncing = false;

	constructor(
		app: App,
		settings: DBBSettings,
		index: LocalIndex,
		status: SyncStatus,
		queueManager: QueueManager,
		rpcClient: RPCClient,
		saveData: () => Promise<void>,
	) {
		this.app = app;
		this.settings = settings;
		this.index = index;
		this.status = status;
		this.queueManager = queueManager;
		this.rpcClient = rpcClient;
		this.saveData = saveData;
	}

	updateSettings(settings: DBBSettings) {
		this.settings = settings;
	}

	async fullSync(pathFilter: (path: string) => boolean) {
		const files = this.app.vault.getMarkdownFiles();
		const now = new Date().toISOString();

		for (const file of files) {
			if (!shouldSyncFile(file, pathFilter)) {
				continue;
			}
			const externalId = buildExternalId(this.settings.vaultId, file.path);
			const entry = this.index.files[externalId];
			if (entry?.lastSeenMtime === file.stat.mtime) {
				continue;
			}
			this.queueManager.enqueue({
				op: "upsert",
				externalId,
				path: file.path,
				lastSeenMtime: file.stat.mtime,
			});
		}

		this.index.lastFullScanAt = now;
		await this.saveData();
	}

	async flushQueue(pathFilter: (path: string) => boolean) {
		if (this.isSyncing) {
			return;
		}
		if (this.queueManager.getQueueLength() === 0) {
			return;
		}
		if (!this.settings.apiBaseUrl || !this.settings.vaultId || !this.settings.deviceId) {
			return;
		}

		this.isSyncing = true;

		try {
			const batch = await this.buildBatch(pathFilter);
			this.queueManager.dropQueueItems(batch.skippedKeys);
			if (batch.items.length === 0) {
				this.isSyncing = false;
				// Signal sync complete when queue is empty
				await this.signalSyncComplete();
				return;
			}

			const response = await this.rpcClient.sendBatch(this.settings.vaultId, this.app.vault.getName(), this.settings.deviceId, batch.items);

			if (!response) {
				this.status.lastError = this.rpcClient.getLastError() ?? "sync_failed";
				this.isSyncing = false;
				return;
			}

			this.applyBatchResult(batch, response);
			await this.saveData();

			if (this.queueManager.getQueueLength() > 0) {
				// Schedule next flush immediately (minimal delay for success)
				window.setTimeout(() => void this.flushQueue(pathFilter), 50);
			} else {
				// Queue is empty, signal sync complete
				await this.signalSyncComplete();
			}
		} finally {
			this.isSyncing = false;
		}
	}

	private async signalSyncComplete() {
		if (!this.settings.vaultId) {
			return;
		}
		await this.rpcClient.signalSyncComplete(this.settings.vaultId);
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

	private async buildBatch(pathFilter: (path: string) => boolean): Promise<{
		items: SyncItem[];
		queueItems: PendingQueueItem[];
		itemMap: Map<string, SyncItem>;
		skippedKeys: Set<string>;
	}> {
		const items: SyncItem[] = [];
		const queueItems: PendingQueueItem[] = [];
		const itemMap = new Map<string, SyncItem>();
		const skippedKeys = new Set<string>();

		// Take up to batchSize items from queue for parallel processing
		const pendingQueue = this.queueManager.getPendingQueue();
		const candidateItems = pendingQueue.slice(0, this.settings.batchSize);

		// Build all items in parallel
		const buildResults = await Promise.all(
			candidateItems.map(async (queued) => {
				const built = await this.buildSyncItem(queued, pathFilter);
				return { queued, built };
			}),
		);

		// Apply byte limit and collect results
		let batchBytes = 0;
		for (const { queued, built } of buildResults) {
			if (!built) {
				skippedKeys.add(toQueueKey(queued));
				continue;
			}

			const projectedBytes = Buffer.byteLength(JSON.stringify(built), "utf8");
			const wouldOverflow = items.length > 0 && projectedBytes + batchBytes > this.settings.maxBytesPerBatch;

			if (wouldOverflow) {
				// Stop adding items but don't skip - they'll be picked up in next batch
				break;
			}

			items.push(built);
			queueItems.push(queued);
			itemMap.set(built.externalId, built);
			batchBytes += projectedBytes;
		}

		return { items, queueItems, itemMap, skippedKeys };
	}

	private async buildSyncItem(queued: PendingQueueItem, pathFilter: (path: string) => boolean): Promise<SyncItem | null> {
		if (queued.op === "delete") {
			return {
				op: "delete",
				externalId: queued.externalId,
				deletedAtSource: new Date().toISOString(),
				metadata: {
					path: queued.path,
				},
			};
		}

		const file = this.app.vault.getAbstractFileByPath(queued.path);
		if (!(file instanceof TFile)) {
			return {
				op: "delete",
				externalId: queued.externalId,
				deletedAtSource: new Date().toISOString(),
				metadata: {
					path: queued.path,
				},
			};
		}

		if (!shouldSyncFile(file, pathFilter)) {
			return null;
		}

		const content = await this.app.vault.cachedRead(file);
		const contentHash = sha256Hex(normalizeForHash(content));
		const existing = this.index.files[queued.externalId];

		if (existing && existing.contentHash === contentHash) {
			existing.lastSeenMtime = file.stat.mtime;
			await this.saveData();
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
			externalId: queued.externalId,
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

	private applyBatchResult(
		batch: {
			items: SyncItem[];
			queueItems: PendingQueueItem[];
			itemMap: Map<string, SyncItem>;
		},
		response: SyncBatchResponse,
	) {
		const queueKeys = new Set(batch.queueItems.map((item) => toQueueKey(item)));
		this.queueManager.dropQueueItems(queueKeys);

		const queueByExternalId = new Map(batch.queueItems.map((item) => [item.externalId, item]));

		for (const result of response.itemResults) {
			const item = batch.itemMap.get(result.externalId);
			const queued = queueByExternalId.get(result.externalId);

			if (!item || result.status !== "accepted") {
				continue;
			}

			if (item.op === "delete") {
				delete this.index.files[item.externalId];
				continue;
			}

			const path = item.metadata && typeof item.metadata.path === "string" ? item.metadata.path : queued?.path;
			if (!path) {
				continue;
			}

			this.index.files[item.externalId] = {
				path,
				contentHash: item.contentHash,
				lastSyncedAt: new Date().toISOString(),
				lastSeenMtime: queued?.lastSeenMtime ?? null,
			};
		}

		this.status.lastSyncAt = new Date().toISOString();
			this.status.lastResult = {
				accepted: response.accepted,
				rejected: response.rejected,
			};
			this.status.lastError = null;
	}
}
