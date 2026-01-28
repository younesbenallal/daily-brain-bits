import { type App, type Plugin, PluginSettingTab, Setting } from "obsidian";
import type { Syncer } from "./syncer";

export type DBBSettings = {
	apiBaseUrl: string;
	pluginToken: string;
	vaultId: string;
	deviceId: string;
	scopeGlob: string;
	batchSize: number;
	debounceMs: number;
	maxBytesPerBatch: number;
};

declare const DBB_API_BASE_URL: string;

export const DEFAULT_SETTINGS: DBBSettings = {
	apiBaseUrl: typeof DBB_API_BASE_URL !== "undefined" ? DBB_API_BASE_URL : "http://localhost:3001",
	pluginToken: "",
	vaultId: "",
	deviceId: "",
	scopeGlob: "",
	batchSize: 100,
	debounceMs: 2000,
	maxBytesPerBatch: 2_000_000,
};

function clampNumber(value: number, fallback: number, min: number): number {
	if (!Number.isFinite(value)) {
		return fallback;
	}
	return Math.max(min, value);
}

export function normalizeSettings(overrides?: Partial<DBBSettings>): DBBSettings {
	const merged = {
		...DEFAULT_SETTINGS,
		...overrides,
	};
	const batchSize = clampNumber(merged.batchSize, DEFAULT_SETTINGS.batchSize, 1);
	const debounceMs = clampNumber(merged.debounceMs, DEFAULT_SETTINGS.debounceMs, 250);
	const maxBytesPerBatch = clampNumber(merged.maxBytesPerBatch, DEFAULT_SETTINGS.maxBytesPerBatch, 50_000);

	return {
		apiBaseUrl: merged.apiBaseUrl,
		pluginToken: merged.pluginToken,
		vaultId: merged.vaultId,
		deviceId: merged.deviceId,
		scopeGlob: merged.scopeGlob,
		batchSize,
		debounceMs,
		maxBytesPerBatch,
	};
}

export type SettingsOwner = Plugin & {
	settings: DBBSettings;
	saveSettings: () => Promise<void>;
	syncer?: Syncer;
	resetSyncState: () => Promise<void>;
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

		new Setting(containerEl)
			.setName("Plugin token")
			.setDesc("Provided by the Daily Brain Bits backend.")
			.addText((text) =>
				text
					.setPlaceholder("paste token")
					.setValue(this.plugin.settings.pluginToken)
					.onChange(async (value) => {
						const nextToken = value.trim();
						const prevToken = this.plugin.settings.pluginToken;
						this.plugin.settings.pluginToken = nextToken;
						await this.plugin.saveSettings();
						if (nextToken && nextToken !== prevToken) {
							await this.plugin.syncer?.refreshConnection();
						}
					}),
			);

		new Setting(containerEl).setName("Scope").setDesc("Scope only affects what this plugin syncs.").setHeading();

		new Setting(containerEl)
			.setName("Glob filter")
			.setDesc("Pattern for notes to include (leave empty to sync everything).")
			.addText((text) =>
				text
					.setPlaceholder("*(!Journaling)")
					.setValue(this.plugin.settings.scopeGlob)
					.onChange(async (value) => {
						this.plugin.settings.scopeGlob = value.trim();
						await this.plugin.saveSettings();
						updatePreview();
					}),
			);

		const previewContainer = containerEl.createDiv({ cls: "dbb-scope-preview" });

		const updatePreview = () => {
			const preview = this.plugin.syncer?.getScopePreview(5);
			previewContainer.empty();

			const title = previewContainer.createEl("strong", { text: "Preview" });
			title.style.display = "block";
			title.style.marginBottom = "6px";

			if (!preview) {
				previewContainer.createEl("div", { text: "Connect the plugin to preview." });
				return;
			}

			const included = previewContainer.createEl("div");
			included.createEl("div", { text: "Included:" });
			if (preview.included.length === 0) {
				included.createEl("div", { text: "No matches yet." });
			} else {
				const list = included.createEl("ul");
				preview.included.forEach((path: string) => {
					list.createEl("li", { text: path });
				});
			}

			const excluded = previewContainer.createEl("div");
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

		updatePreview();

		new Setting(containerEl).setName("Sync behavior").setHeading();

		new Setting(containerEl)
			.setName("Sync now")
			.setDesc("Trigger a full sync with the current scope.")
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

		new Setting(containerEl)
			.setName("Batch size")
			.setDesc("Maximum number of items per sync request.")
			.addText((text) =>
				text
					.setPlaceholder("50")
					.setValue(String(this.plugin.settings.batchSize))
					.onChange(async (value) => {
						const parsed = Number.parseInt(value, 10);
						this.plugin.settings.batchSize = Number.isNaN(parsed) ? this.plugin.settings.batchSize : parsed;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("Debounce (ms)")
			.setDesc("Wait this long after changes before syncing.")
			.addText((text) =>
				text
					.setPlaceholder("2000")
					.setValue(String(this.plugin.settings.debounceMs))
					.onChange(async (value) => {
						const parsed = Number.parseInt(value, 10);
						this.plugin.settings.debounceMs = Number.isNaN(parsed) ? this.plugin.settings.debounceMs : parsed;
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
