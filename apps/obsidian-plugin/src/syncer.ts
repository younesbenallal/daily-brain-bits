import { buildExternalId } from "@daily-brain-bits/integrations-obsidian";
import { type App, debounce, Notice, type TFile } from "obsidian";
import { QueueManager } from "./queue-manager";
import { RPCClient } from "./rpc-client";
import type { DBBSettings } from "./settings";
import { SyncOperations } from "./sync-operations";
import { buildScopeFilter, normalizeGlobPatterns, shouldSyncFile } from "./sync-utils";
import type { LocalIndex, SyncStatus } from "./types";

export class Syncer {
	private app: App;
	private settings: DBBSettings;
	private status: SyncStatus;
	private pathFilter: (path: string) => boolean;
	private flushDebounced: () => void;
	private queueManager: QueueManager;
	private rpcClient: RPCClient;
	private syncOperations: SyncOperations;

	constructor(app: App, settings: DBBSettings, index: LocalIndex, saveData: () => Promise<void>) {
		this.app = app;
		this.settings = settings;
		this.status = {
			lastSyncAt: null,
			lastError: null,
			lastResult: null,
		};
		this.pathFilter = buildScopeFilter(settings.scopeGlob);

		this.queueManager = new QueueManager(index, saveData);
		this.rpcClient = new RPCClient(settings.apiBaseUrl, settings.pluginToken);
		this.syncOperations = new SyncOperations(app, settings, index, this.status, this.queueManager, this.rpcClient, saveData);

		this.flushDebounced = debounce(() => void this.flushQueue(), settings.debounceMs, true);
	}

	updateSettings(settings: DBBSettings) {
		this.settings = settings;
		this.pathFilter = buildScopeFilter(settings.scopeGlob);
		this.flushDebounced = debounce(() => void this.flushQueue(), settings.debounceMs, true);
		this.rpcClient.updateSettings(settings.apiBaseUrl, settings.pluginToken);
		this.syncOperations.updateSettings(settings);
	}

	getStatus(): SyncStatus {
		return this.status;
	}

	getScopeStatus() {
		return {
			ready: true,
			patterns: normalizeGlobPatterns(this.settings.scopeGlob),
			updatedAt: null,
		};
	}

	getScopePreview(limit = 5) {
		const files = this.app.vault.getMarkdownFiles();
		const included: string[] = [];
		const excluded: string[] = [];

		for (const file of files) {
			if (this.pathFilter(file.path)) {
				if (included.length < limit) {
					included.push(file.path);
				}
			} else if (excluded.length < limit) {
				excluded.push(file.path);
			}

			if (included.length >= limit && excluded.length >= limit) {
				break;
			}
		}

		return { included, excluded };
	}

	enqueueUpsert(file: TFile) {
		if (!shouldSyncFile(file, this.pathFilter)) {
			return;
		}
		const externalId = buildExternalId(this.settings.vaultId, file.path);
		this.queueManager.enqueue({
			op: "upsert",
			externalId,
			path: file.path,
			lastSeenMtime: file.stat.mtime,
		});
		this.flushDebounced();
	}

	enqueueDelete(path: string) {
		const externalId = buildExternalId(this.settings.vaultId, path);
		this.queueManager.enqueue({
			op: "delete",
			externalId,
			path,
		});
		this.flushDebounced();
	}

	onCreate(file: TFile) {
		this.enqueueUpsert(file);
	}

	onModify(file: TFile) {
		this.enqueueUpsert(file);
	}

	onDelete(path: string) {
		this.enqueueDelete(path);
	}

	onRename(file: TFile, oldPath: string) {
		this.enqueueDelete(oldPath);
		this.enqueueUpsert(file);
	}

	async fullSync() {
		await this.syncOperations.fullSync(this.pathFilter);
		this.flushDebounced();
	}

	async flushQueue() {
		if (!this.settings.apiBaseUrl || !this.settings.vaultId || !this.settings.deviceId) {
			new Notice("Daily Brain Bits: missing API base URL, Vault ID, or Device ID.");
			return;
		}

		await this.syncOperations.flushQueue(this.pathFilter);
	}
}
