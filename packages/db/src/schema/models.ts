import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import type {
  documents,
  emailBatchStatus,
  emailBatches,
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
} from "./index";

export type IntegrationKind = (typeof integrationKind.enumValues)[number];
export type IntegrationStatus = (typeof integrationStatus.enumValues)[number];
export type IntegrationScopeType = (typeof integrationScopeType.enumValues)[number];
export type SyncRunKind = (typeof syncRunKind.enumValues)[number];
export type SyncRunStatus = (typeof syncRunStatus.enumValues)[number];
export type ReviewStatus = (typeof reviewStatus.enumValues)[number];
export type EmailBatchStatus = (typeof emailBatchStatus.enumValues)[number];

export type IntegrationConnection = InferSelectModel<typeof integrationConnections>;
export type IntegrationConnectionInsert = InferInsertModel<
  typeof integrationConnections
>;

export type IntegrationScopeItem = InferSelectModel<typeof integrationScopeItems>;
export type IntegrationScopeItemInsert = InferInsertModel<
  typeof integrationScopeItems
>;

export type ObsidianVault = InferSelectModel<typeof obsidianVaults>;
export type ObsidianVaultInsert = InferInsertModel<typeof obsidianVaults>;

export type DocumentRow = InferSelectModel<typeof documents>;
export type DocumentRowInsert = InferInsertModel<typeof documents>;

export type SyncStateRow = InferSelectModel<typeof syncState>;
export type SyncStateRowInsert = InferInsertModel<typeof syncState>;

export type SyncRun = InferSelectModel<typeof syncRuns>;
export type SyncRunInsert = InferInsertModel<typeof syncRuns>;

export type ReviewState = InferSelectModel<typeof reviewStates>;
export type ReviewStateInsert = InferInsertModel<typeof reviewStates>;

export type ReviewEvent = InferSelectModel<typeof reviewEvents>;
export type ReviewEventInsert = InferInsertModel<typeof reviewEvents>;

export type EmailBatch = InferSelectModel<typeof emailBatches>;
export type EmailBatchInsert = InferInsertModel<typeof emailBatches>;

export type EmailItem = InferSelectModel<typeof emailItems>;
export type EmailItemInsert = InferInsertModel<typeof emailItems>;

