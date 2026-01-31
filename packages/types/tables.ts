import type {
	documents,
	integrationConnections,
	integrationKind,
	integrationScopeItems,
	integrationScopeType,
	integrationStatus,
	noteDigestItems,
	noteDigestStatus,
	noteDigests,
	reviewEvents,
	reviewStates,
	reviewStatus,
	syncRunKind,
	syncRunStatus,
	syncRuns,
	syncState,
	userSettings,
} from "@daily-brain-bits/db";

export type IntegrationKind = (typeof integrationKind.enumValues)[number];
export type IntegrationStatus = (typeof integrationStatus.enumValues)[number];
export type IntegrationScopeType = (typeof integrationScopeType.enumValues)[number];
export type SyncRunKind = (typeof syncRunKind.enumValues)[number];
export type SyncRunStatus = (typeof syncRunStatus.enumValues)[number];
export type ReviewStatus = (typeof reviewStatus.enumValues)[number];
export type NoteDigestStatus = (typeof noteDigestStatus.enumValues)[number];

export type IntegrationConnection = typeof integrationConnections.$inferSelect;
export type IntegrationConnectionInsert = typeof integrationConnections.$inferInsert;

export type IntegrationScopeItem = typeof integrationScopeItems.$inferSelect;
export type IntegrationScopeItemInsert = typeof integrationScopeItems.$inferInsert;

export type DocumentRow = typeof documents.$inferSelect;
export type DocumentRowInsert = typeof documents.$inferInsert;

export type SyncStateRow = typeof syncState.$inferSelect;
export type SyncStateRowInsert = typeof syncState.$inferInsert;

export type SyncRun = typeof syncRuns.$inferSelect;
export type SyncRunInsert = typeof syncRuns.$inferInsert;

export type ReviewState = typeof reviewStates.$inferSelect;
export type ReviewStateInsert = typeof reviewStates.$inferInsert;

export type ReviewEvent = typeof reviewEvents.$inferSelect;
export type ReviewEventInsert = typeof reviewEvents.$inferInsert;

export type NoteDigest = typeof noteDigests.$inferSelect;
export type NoteDigestInsert = typeof noteDigests.$inferInsert;

export type NoteDigestItem = typeof noteDigestItems.$inferSelect;
export type NoteDigestItemInsert = typeof noteDigestItems.$inferInsert;

export type UserSettings = typeof userSettings.$inferSelect;
export type UserSettingsInsert = typeof userSettings.$inferInsert;
