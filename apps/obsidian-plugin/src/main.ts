import { Notice, Plugin } from "obsidian";
import { shouldSyncNow } from "./diff";
import { DBBSettingTab, normalizeSettings } from "./settings";
import { mergePluginData } from "./storage";
import type { LocalIndex } from "./types";
import { Syncer } from "./syncer";

const SECRET_KEY = "dbb-plugin-token";

export default class DailyBrainBitsPlugin extends Plugin {
	settings = normalizeSettings();
	index: LocalIndex = {
		files: {},
		lastSyncAt: null,
	};
	syncer!: Syncer;
	private pluginToken = "";

	async onload() {
		const data = mergePluginData(await this.loadData());
		this.settings = data.settings;
		this.index = data.index;
		this.ensureIds();

		// Load token from secret storage
		this.pluginToken = this.app.secretStorage.getSecret(SECRET_KEY) ?? "";

		// Migrate legacy token from settings if exists
		const rawData = (await this.loadData()) as { settings?: { pluginToken?: string } } | null;
		if (rawData?.settings?.pluginToken && !this.pluginToken) {
			this.pluginToken = rawData.settings.pluginToken;
			this.app.secretStorage.setSecret(SECRET_KEY, this.pluginToken);
			// Remove from settings by re-saving without pluginToken
		}

		await this.saveData({
			settings: this.settings,
			index: this.index,
		});

		this.syncer = new Syncer(this.app, this.settings, this.index, () => this.getToken(), () => this.saveData({ settings: this.settings, index: this.index }));

		this.addSettingTab(new DBBSettingTab(this.app, this));

		this.addCommand({
			id: "dbb-sync-now",
			name: "DBB: Sync now",
			callback: () => void this.syncer.fullSync(),
		});

		this.addCommand({
			id: "dbb-sync-status",
			name: "DBB: Show sync status",
			callback: () => {
				const status = this.syncer.getStatus();
				const index = this.syncer.getIndex();
				const scope = this.syncer.getScopeStatus();
				const scopeLabel = scope.patterns.length > 0 ? `${scope.patterns.length} pattern(s)` : "all notes";
				const fileCount = Object.keys(index.files).length;
				const lastSync = index.lastSyncAt ? new Date(index.lastSyncAt).toLocaleString() : "never";

				const message = [
					`Last sync: ${lastSync}`,
					`Synced files: ${fileCount}`,
					`Scope: ${scopeLabel}`,
					`Interval: ${this.settings.syncInterval}`,
					status.lastError ? `Error: ${status.lastError}` : null,
				]
					.filter(Boolean)
					.join("\n");
				new Notice(message);
			},
		});

		// Check if we should sync on startup based on interval
		this.app.workspace.onLayoutReady(() => {
			if (shouldSyncNow(this.index.lastSyncAt, this.settings.syncInterval)) {
				void this.syncer.fullSync();
			}
		});
	}

	async saveSettings() {
		this.settings = normalizeSettings(this.settings);
		await this.saveData({
			settings: this.settings,
			index: this.index,
		});
		if (this.syncer) {
			this.syncer.updateSettings(this.settings);
		}
	}

	async resetSyncState() {
		this.index.files = {};
		this.index.lastSyncAt = null;
		await this.saveData({
			settings: this.settings,
			index: this.index,
		});
		if (this.syncer) {
			this.syncer.resetLocalIndex();
		}
		new Notice("Daily Brain Bits: local sync state cleared.");
	}

	private ensureIds() {
		if (!this.settings.vaultId) {
			this.settings.vaultId = crypto.randomUUID();
		}
		if (!this.settings.deviceId) {
			this.settings.deviceId = crypto.randomUUID();
		}
	}

	getToken(): string {
		return this.pluginToken;
	}

	setToken(token: string): void {
		this.pluginToken = token;
		this.app.secretStorage.setSecret(SECRET_KEY, token);
		if (this.syncer) {
			this.syncer.updateToken(token);
		}
	}
}
