import type {
  documents,
  emailBatches,
  emailBatchStatus,
  emailItems,
  integrationConnections,
  integrationKind,
  integrationScopeItems,
  integrationScopeType,
  integrationStatus,
  obsidianVaults,
  reviewEvents,
  reviewStates,
  reviewStatus,
  syncRunKind,
  syncRunStatus,
  syncRuns,
  syncState,
} from "@daily-brain-bits/db";

export type IntegrationKind = (typeof integrationKind.enumValues)[number];
export type IntegrationStatus = (typeof integrationStatus.enumValues)[number];
export type IntegrationScopeType = (typeof integrationScopeType.enumValues)[number];
export type SyncRunKind = (typeof syncRunKind.enumValues)[number];
export type SyncRunStatus = (typeof syncRunStatus.enumValues)[number];
export type ReviewStatus = (typeof reviewStatus.enumValues)[number];
export type EmailBatchStatus = (typeof emailBatchStatus.enumValues)[number];

export type IntegrationConnection = typeof integrationConnections.$inferSelect;
export type IntegrationConnectionInsert = typeof integrationConnections.$inferInsert;

export type IntegrationScopeItem = typeof integrationScopeItems.$inferSelect;
export type IntegrationScopeItemInsert = typeof integrationScopeItems.$inferInsert;

export type ObsidianVault = typeof obsidianVaults.$inferSelect;
export type ObsidianVaultInsert = typeof obsidianVaults.$inferInsert;

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

export type EmailBatch = typeof emailBatches.$inferSelect;
export type EmailBatchInsert = typeof emailBatches.$inferInsert;

export type EmailItem = typeof emailItems.$inferSelect;
export type EmailItemInsert = typeof emailItems.$inferInsert;
