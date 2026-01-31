import { type App, type Plugin, PluginSettingTab, SecretComponent, Setting } from "obsidian";
import type { Syncer } from "./syncer";
import type { SyncInterval } from "./types";

export type DBBSettings = {
	apiBaseUrl: string;
	vaultId: string;
	deviceId: string;
	scopeGlob: string;
	batchSize: number;
	maxBytesPerBatch: number;
	syncInterval: SyncInterval;
};

declare const DBB_API_BASE_URL: string;

export const DEFAULT_SETTINGS: DBBSettings = {
	apiBaseUrl: typeof DBB_API_BASE_URL !== "undefined" ? DBB_API_BASE_URL : "http://localhost:3001",
	vaultId: "",
	deviceId: "",
	scopeGlob: "",
	batchSize: 100,
	maxBytesPerBatch: 2_000_000,
	syncInterval: "daily",
};

function clampNumber(value: number, fallback: number, min: number): number {
	if (!Number.isFinite(value)) {
		return fallback;
	}
	return Math.max(min, value);
}

const VALID_INTERVALS: SyncInterval[] = ["daily", "weekly", "manual"];

export function normalizeSettings(overrides?: Partial<DBBSettings>): DBBSettings {
	const merged = {
		...DEFAULT_SETTINGS,
		...overrides,
	};
	const batchSize = clampNumber(merged.batchSize, DEFAULT_SETTINGS.batchSize, 1);
	const maxBytesPerBatch = clampNumber(merged.maxBytesPerBatch, DEFAULT_SETTINGS.maxBytesPerBatch, 50_000);
	const syncInterval = VALID_INTERVALS.includes(merged.syncInterval) ? merged.syncInterval : DEFAULT_SETTINGS.syncInterval;

	return {
		apiBaseUrl: merged.apiBaseUrl,
		vaultId: merged.vaultId,
		deviceId: merged.deviceId,
		scopeGlob: merged.scopeGlob,
		batchSize,
		maxBytesPerBatch,
		syncInterval,
	};
}

export type SettingsOwner = Plugin & {
	settings: DBBSettings;
	saveSettings: () => Promise<void>;
	syncer?: Syncer;
	resetSyncState: () => Promise<void>;
	getToken: () => string;
	setToken: (token: string) => void;
};

export class DBBSettingTab extends PluginSettingTab {
	private plugin: SettingsOwner;

	constructor(app: App, plugin: SettingsOwner) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName("API base URL")
			.setDesc("Backend base URL for sync requests.")
			.addText((text) =>
				text
					.setPlaceholder("http://localhost:3001")
					.setValue(this.plugin.settings.apiBaseUrl)
					.onChange(async (value) => {
						this.plugin.settings.apiBaseUrl = value.trim();
						await this.plugin.saveSettings();
					}),
			);

		const tokenSetting = new Setting(containerEl)
			.setName("Plugin token")
			.setDesc("Provided by the Daily Brain Bits backend. Stored securely via Obsidian's secret storage.");

		new SecretComponent(this.app, tokenSetting.controlEl)
			.setValue(this.plugin.getToken())
			.onChange(async (value) => {
				const nextToken = value.trim();
				const prevToken = this.plugin.getToken();
				this.plugin.setToken(nextToken);
				if (nextToken && nextToken !== prevToken) {
					await this.plugin.syncer?.refreshConnection();
				}
			});

		new Setting(containerEl).setName("Scope").setDesc("Scope only affects what this plugin syncs.").setHeading();

		const globHintEl = containerEl.createDiv({ cls: "setting-item-description" });
		globHintEl.style.marginBottom = "12px";
		globHintEl.innerHTML = `
			<strong>Glob filter</strong> — Pattern(s) for notes to include or exclude. Leave empty to sync all notes.<br>
			<span style="opacity: 0.8; font-size: 0.9em;">
				One pattern per line. Prefix with <code>!</code> to exclude. Supports <code>*</code> (any chars), <code>**</code> (recursive), <code>?</code> (single char).<br><br>
				<strong>Examples:</strong><br>
				<code>Projects/**</code> — all notes in Projects folder<br>
				<code>!Journaling/**</code> — exclude Journaling folder<br>
				<code>Notes/*</code> — direct children of Notes only
			</span>
		`;

		new Setting(containerEl)
			.addTextArea((text) =>
				text
					.setPlaceholder("!Journaling/**\n!Templates/**")
					.setValue(this.plugin.settings.scopeGlob)
					.onChange(async (value) => {
						this.plugin.settings.scopeGlob = value.trim();
						await this.plugin.saveSettings();
						updatePreview();
					}),
			)
			.then((setting) => {
				const textarea = setting.controlEl.querySelector("textarea");
				if (textarea) {
					textarea.style.width = "100%";
					textarea.style.minHeight = "60px";
				}
			});

		const previewContainer = containerEl.createDiv({ cls: "dbb-scope-preview" });
		const previewToggle = previewContainer.createEl("a", { text: "Show preview", href: "#" });
		previewToggle.style.cursor = "pointer";
		previewToggle.style.fontSize = "0.9em";

		const previewContent = previewContainer.createDiv();
		previewContent.style.display = "none";
		previewContent.style.marginTop = "8px";

		let previewVisible = false;

		const updatePreview = () => {
			const preview = this.plugin.syncer?.getScopePreview(5);
			previewContent.empty();

			if (!preview) {
				previewContent.createEl("div", { text: "Connect the plugin to preview." });
				return;
			}

			const included = previewContent.createEl("div");
			included.createEl("div", { text: "Included:" });
			if (preview.included.length === 0) {
				included.createEl("div", { text: "No matches yet." });
			} else {
				const list = included.createEl("ul");
				preview.included.forEach((path: string) => {
					list.createEl("li", { text: path });
				});
			}

			const excluded = previewContent.createEl("div");
			excluded.style.marginTop = "6px";
			excluded.createEl("div", { text: "Excluded:" });
			if (preview.excluded.length === 0) {
				excluded.createEl("div", { text: "No exclusions yet." });
			} else {
				const list = excluded.createEl("ul");
				preview.excluded.forEach((path: string) => {
					list.createEl("li", { text: path });
				});
			}
		};

		previewToggle.addEventListener("click", (e) => {
			e.preventDefault();
			previewVisible = !previewVisible;
			previewContent.style.display = previewVisible ? "block" : "none";
			previewToggle.textContent = previewVisible ? "Hide preview" : "Show preview";
			if (previewVisible) {
				updatePreview();
			}
		});

		new Setting(containerEl).setName("Sync behavior").setHeading();

		new Setting(containerEl)
			.setName("Sync interval")
			.setDesc("How often to sync your notes. Sync runs when you open Obsidian if the interval has passed.")
			.addDropdown((dropdown) =>
				dropdown
					.addOption("daily", "Daily")
					.addOption("weekly", "Weekly")
					.addOption("manual", "Manual only")
					.setValue(this.plugin.settings.syncInterval)
					.onChange(async (value) => {
						this.plugin.settings.syncInterval = value as SyncInterval;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("Sync now")
			.setDesc("Trigger a sync with the current scope.")
			.addButton((button) => button.setButtonText("Sync now").onClick(() => void this.plugin.syncer?.fullSync()));

		new Setting(containerEl)
			.setName("Reset local index")
			.setDesc("Clears local sync state so the next sync re-sends everything.")
			.addButton((button) =>
				button.setButtonText("Reset & sync").onClick(async () => {
					await this.plugin.resetSyncState();
					await this.plugin.syncer?.fullSync();
				}),
			);

		new Setting(containerEl).setName("Advanced").setHeading();

		new Setting(containerEl)
			.setName("Batch size")
			.setDesc("Maximum number of items per sync request.")
			.addText((text) =>
				text
					.setPlaceholder("100")
					.setValue(String(this.plugin.settings.batchSize))
					.onChange(async (value) => {
						const parsed = Number.parseInt(value, 10);
						this.plugin.settings.batchSize = Number.isNaN(parsed) ? this.plugin.settings.batchSize : parsed;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("Max bytes per batch")
			.setDesc("Soft limit for request payload size.")
			.addText((text) =>
				text
					.setPlaceholder("2000000")
					.setValue(String(this.plugin.settings.maxBytesPerBatch))
					.onChange(async (value) => {
						const parsed = Number.parseInt(value, 10);
						this.plugin.settings.maxBytesPerBatch = Number.isNaN(parsed) ? this.plugin.settings.maxBytesPerBatch : parsed;
						await this.plugin.saveSettings();
					}),
			);
	}
}
