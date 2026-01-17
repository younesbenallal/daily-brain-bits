import { Notice, Plugin, TFile } from "obsidian";
import { DBBSettingTab, normalizeSettings } from "./settings";
import { mergePluginData } from "./storage";
import type { LocalIndex } from "./types";
import { Syncer } from "./syncer";

export default class DailyBrainBitsPlugin extends Plugin {
	settings = normalizeSettings();
	index: LocalIndex = {
		files: {},
		pendingQueue: [],
		lastFullScanAt: null,
	};
	syncer!: Syncer;

	async onload() {
		const data = mergePluginData(await this.loadData());
		this.settings = data.settings;
		this.index = data.index;
		this.ensureIds();

		await this.saveData({
			settings: this.settings,
			index: this.index,
		});

		this.syncer = new Syncer(this.app, this.settings, this.index, () => this.saveData({ settings: this.settings, index: this.index }));

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
				const scope = this.syncer.getScopeStatus();
				const scopeLabel = scope.ready ? (scope.patterns.length > 0 ? `${scope.patterns.length} pattern(s)` : "all (no patterns)") : "loading";
				const message = [
					`Last sync: ${status.lastSyncAt ?? "never"}`,
					`Pending: ${this.index.pendingQueue.length}`,
					`Scope: ${scopeLabel}`,
					status.lastError ? `Error: ${status.lastError}` : null,
				]
					.filter(Boolean)
					.join("\n");
				new Notice(message);
			},
		});

		this.registerEvent(
			this.app.vault.on("create", (file) => {
				if (file instanceof TFile) {
					this.syncer.onCreate(file);
				}
			}),
		);
		this.registerEvent(
			this.app.vault.on("modify", (file) => {
				if (file instanceof TFile) {
					this.syncer.onModify(file);
				}
			}),
		);
		this.registerEvent(
			this.app.vault.on("delete", (file) => {
				if (file instanceof TFile) {
					this.syncer.onDelete(file.path);
				}
			}),
		);
		this.registerEvent(
			this.app.vault.on("rename", (file, oldPath) => {
				if (file instanceof TFile) {
					this.syncer.onRename(file, oldPath);
				}
			}),
		);

		await this.syncer.refreshScope({ triggerSync: false });
		const scopeStatus = this.syncer.getScopeStatus();
		const nextGlob = scopeStatus.patterns[0] ?? "";
		if (this.settings.scopeGlob !== nextGlob) {
			this.settings.scopeGlob = nextGlob;
			await this.saveSettings();
		}
		this.registerInterval(window.setInterval(() => void this.syncer.refreshScope(), 5 * 60 * 1000));
		window.setTimeout(() => void this.syncer.fullSync(), 5_000);
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

	private ensureIds() {
		if (!this.settings.vaultId) {
			this.settings.vaultId = crypto.randomUUID();
		}
		if (!this.settings.deviceId) {
			this.settings.deviceId = crypto.randomUUID();
		}
	}
}
