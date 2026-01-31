import { buildExternalId } from "@daily-brain-bits/integrations-obsidian";
import { type App, Notice } from "obsidian";
import { computeSyncDiff, type VaultFile } from "./diff";
import { RPCClient } from "./rpc-client";
import type { DBBSettings } from "./settings";
import { SyncOperations } from "./sync-operations";
import { buildScopeFilter, parseGlobPatterns, shouldSyncFile } from "./sync-utils";
import type { LocalIndex, SyncStatus } from "./types";

export class Syncer {
	private app: App;
	private settings: DBBSettings;
	private index: LocalIndex;
	private status: SyncStatus;
	private pathFilter: (path: string) => boolean;
	private rpcClient: RPCClient;
	private syncOperations: SyncOperations;
	private saveData: () => Promise<void>;

	constructor(app: App, settings: DBBSettings, index: LocalIndex, saveData: () => Promise<void>) {
		this.app = app;
		this.settings = settings;
		this.index = index;
		this.saveData = saveData;
		this.status = {
			lastSyncAt: null,
			lastError: null,
			lastResult: null,
		};
		this.pathFilter = buildScopeFilter(settings.scopeGlob);

		this.rpcClient = new RPCClient(settings.apiBaseUrl, settings.pluginToken);
		this.syncOperations = new SyncOperations(app, settings, index, this.status, this.rpcClient);
	}

	updateSettings(settings: DBBSettings) {
		this.settings = settings;
		this.pathFilter = buildScopeFilter(settings.scopeGlob);
		this.rpcClient.updateSettings(settings.apiBaseUrl, settings.pluginToken);
		this.syncOperations.updateSettings(settings);
	}

	getStatus(): SyncStatus {
		return this.status;
	}

	getIndex(): LocalIndex {
		return this.index;
	}

	resetLocalIndex() {
		this.index.files = {};
		this.index.lastSyncAt = null;
		this.status.lastError = null;
		this.status.lastResult = null;
		this.status.lastSyncAt = null;
	}

	async refreshConnection() {
		this.status.lastError = null;
		if (!this.settings.apiBaseUrl || !this.settings.vaultId || !this.settings.deviceId || !this.settings.pluginToken) {
			this.status.lastError = "missing_settings";
			new Notice("Daily Brain Bits: missing API base URL, Vault ID, Device ID, or API token.");
			return;
		}
		await this.syncOperations.connect();
		if (this.status.lastError) {
			new Notice(`Daily Brain Bits: connection refresh failed (${this.status.lastError}).`);
			return;
		}
		new Notice("Daily Brain Bits: connection refreshed.");
	}

	getScopeStatus() {
		const { include, exclude } = parseGlobPatterns(this.settings.scopeGlob);
		return {
			ready: true,
			patterns: [...include, ...exclude.map((p) => `!${p}`)],
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

	async fullSync() {
		this.status.lastError = null;

		if (!this.settings.apiBaseUrl || !this.settings.vaultId || !this.settings.deviceId || !this.settings.pluginToken) {
			this.status.lastError = "missing_settings";
			new Notice("Daily Brain Bits: missing settings. Please configure the plugin.");
			return;
		}

		// Get current vault state
		const vaultFiles = this.getVaultFiles();

		// Compute diff
		const buildId = (path: string) => buildExternalId(this.settings.vaultId, path);
		const diff = computeSyncDiff(vaultFiles, this.index.files, buildId);

		const totalChanges = diff.toUpsert.length + diff.toDelete.length;

		if (totalChanges === 0) {
			this.index.lastSyncAt = Date.now();
			await this.saveData();
			return;
		}

		// Perform sync
		const result = await this.syncOperations.performSync(diff, this.pathFilter);

		if (result) {
			this.status.lastSyncAt = new Date().toISOString();
			this.status.lastResult = result;
			this.status.lastError = null;
			this.index.lastSyncAt = Date.now();
		}

		await this.saveData();
	}

	private getVaultFiles(): VaultFile[] {
		const files = this.app.vault.getMarkdownFiles();
		const result: VaultFile[] = [];

		for (const file of files) {
			if (shouldSyncFile(file, this.pathFilter)) {
				result.push({
					path: file.path,
					mtime: file.stat.mtime,
				});
			}
		}

		return result;
	}
}
