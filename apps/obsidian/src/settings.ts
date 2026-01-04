import { App, PluginSettingTab, Setting } from "obsidian";

export type DBBSettings = {
  apiBaseUrl: string;
  pluginToken: string;
  vaultId: string;
  deviceId: string;
  includeFolders: string[];
  excludeFolders: string[];
  excludePatterns: string[];
  includeOnlyMarkdown: boolean;
  includeAttachments: boolean;
  batchSize: number;
  debounceMs: number;
  maxBytesPerBatch: number;
};

export const DEFAULT_SETTINGS: DBBSettings = {
  apiBaseUrl: "http://localhost:3001",
  pluginToken: "",
  vaultId: "",
  deviceId: "",
  includeFolders: [],
  excludeFolders: [],
  excludePatterns: [],
  includeOnlyMarkdown: true,
  includeAttachments: false,
  batchSize: 50,
  debounceMs: 2000,
  maxBytesPerBatch: 2_000_000,
};

const listSeparator = /[\n,]/;

export function parseList(value: string): string[] {
  return value
    .split(listSeparator)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function formatList(list: string[]): string {
  return list.join("\n");
}

function clampNumber(value: number, fallback: number, min: number): number {
  if (!Number.isFinite(value)) {
    return fallback;
  }
  return Math.max(min, value);
}

export function normalizeSettings(
  overrides?: Partial<DBBSettings>
): DBBSettings {
  const merged = {
    ...DEFAULT_SETTINGS,
    ...overrides,
  };

  merged.includeFolders = Array.isArray(merged.includeFolders)
    ? merged.includeFolders.filter(Boolean)
    : [];
  merged.excludeFolders = Array.isArray(merged.excludeFolders)
    ? merged.excludeFolders.filter(Boolean)
    : [];
  merged.excludePatterns = Array.isArray(merged.excludePatterns)
    ? merged.excludePatterns.filter(Boolean)
    : [];
  merged.batchSize = clampNumber(merged.batchSize, DEFAULT_SETTINGS.batchSize, 1);
  merged.debounceMs = clampNumber(
    merged.debounceMs,
    DEFAULT_SETTINGS.debounceMs,
    250
  );
  merged.maxBytesPerBatch = clampNumber(
    merged.maxBytesPerBatch,
    DEFAULT_SETTINGS.maxBytesPerBatch,
    50_000
  );

  return merged;
}

export type SettingsOwner = {
  settings: DBBSettings;
  saveSettings: () => Promise<void>;
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
          })
      );

    new Setting(containerEl)
      .setName("Plugin token")
      .setDesc("Provided by the Daily Brain Bits backend.")
      .addText((text) =>
        text
          .setPlaceholder("paste token")
          .setValue(this.plugin.settings.pluginToken)
          .onChange(async (value) => {
            this.plugin.settings.pluginToken = value.trim();
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Vault ID")
      .setDesc("Stable vault identifier used for sync.")
      .addText((text) =>
        text
          .setPlaceholder("auto-generated")
          .setValue(this.plugin.settings.vaultId)
          .onChange(async (value) => {
            this.plugin.settings.vaultId = value.trim();
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Device ID")
      .setDesc("Unique device identifier for this install.")
      .addText((text) =>
        text
          .setPlaceholder("auto-generated")
          .setValue(this.plugin.settings.deviceId)
          .onChange(async (value) => {
            this.plugin.settings.deviceId = value.trim();
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl).setName("Scope").setHeading();

    new Setting(containerEl)
      .setName("Include folders")
      .setDesc("Only sync notes under these folders (one per line).")
      .addTextArea((text) =>
        text
          .setValue(formatList(this.plugin.settings.includeFolders))
          .onChange(async (value) => {
            this.plugin.settings.includeFolders = parseList(value);
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Exclude folders")
      .setDesc("Skip notes under these folders (one per line).")
      .addTextArea((text) =>
        text
          .setValue(formatList(this.plugin.settings.excludeFolders))
          .onChange(async (value) => {
            this.plugin.settings.excludeFolders = parseList(value);
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Exclude patterns")
      .setDesc("Glob patterns to exclude from sync (one per line).")
      .addTextArea((text) =>
        text
          .setValue(formatList(this.plugin.settings.excludePatterns))
          .onChange(async (value) => {
            this.plugin.settings.excludePatterns = parseList(value);
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Include only Markdown")
      .setDesc("Ignore non-markdown files.")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.includeOnlyMarkdown)
          .onChange(async (value) => {
            this.plugin.settings.includeOnlyMarkdown = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Include attachments")
      .setDesc("Reserved for future support. Attachments are ignored for now.")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.includeAttachments)
          .onChange(async (value) => {
            this.plugin.settings.includeAttachments = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl).setName("Sync behavior").setHeading();

    new Setting(containerEl)
      .setName("Batch size")
      .setDesc("Maximum number of items per sync request.")
      .addText((text) =>
        text
          .setPlaceholder("50")
          .setValue(String(this.plugin.settings.batchSize))
          .onChange(async (value) => {
            const parsed = Number.parseInt(value, 10);
            this.plugin.settings.batchSize = Number.isNaN(parsed)
              ? this.plugin.settings.batchSize
              : parsed;
            await this.plugin.saveSettings();
          })
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
            this.plugin.settings.debounceMs = Number.isNaN(parsed)
              ? this.plugin.settings.debounceMs
              : parsed;
            await this.plugin.saveSettings();
          })
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
            this.plugin.settings.maxBytesPerBatch = Number.isNaN(parsed)
              ? this.plugin.settings.maxBytesPerBatch
              : parsed;
            await this.plugin.saveSettings();
          })
      );
  }
}
