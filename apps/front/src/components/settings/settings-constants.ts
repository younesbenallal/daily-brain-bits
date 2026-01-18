export const settingsTabs = ["app", "account", "billing"] as const;
export type SettingsTab = (typeof settingsTabs)[number];
