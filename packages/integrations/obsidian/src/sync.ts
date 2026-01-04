import { z } from "zod";
import {
  syncItemDeleteSchema as coreDeleteSchema,
  syncItemUpsertSchema as coreUpsertSchema,
} from "@daily-brain-bits/core";

const nonEmptyString = z.string().min(1);

const obsidianMetadataSchema = z
  .object({
    path: nonEmptyString,
  })
  .passthrough();

export const syncItemUpsertSchema = coreUpsertSchema.extend({
  metadata: obsidianMetadataSchema,
});

export const syncItemDeleteSchema = coreDeleteSchema.extend({
  metadata: obsidianMetadataSchema,
});

export const syncItemSchema = z.discriminatedUnion("op", [
  syncItemUpsertSchema,
  syncItemDeleteSchema,
]);

export const syncBatchRequestSchema = z.object({
  vaultId: nonEmptyString,
  deviceId: nonEmptyString,
  sentAt: z.string().datetime(),
  items: z.array(syncItemSchema).min(1),
});

export const syncItemResultSchema = z.object({
  externalId: nonEmptyString,
  status: z.enum(["accepted", "rejected", "skipped"]),
  reason: z.string().optional(),
});

export const syncBatchResponseSchema = z.object({
  accepted: z.number().int(),
  rejected: z.number().int(),
  itemResults: z.array(syncItemResultSchema),
});

export const obsidianRegisterResponseSchema = z.object({
  pluginToken: nonEmptyString,
  vaultId: nonEmptyString,
  apiBaseUrl: nonEmptyString,
  connectionId: z.number().int().optional(),
});

export const obsidianScopeResponseSchema = z.object({
  vaultId: nonEmptyString,
  patterns: z.array(nonEmptyString),
  updatedAt: z.string().datetime().optional(),
});

export type SyncItemUpsert = z.infer<typeof syncItemUpsertSchema>;
export type SyncItemDelete = z.infer<typeof syncItemDeleteSchema>;
export type SyncItem = z.infer<typeof syncItemSchema>;
export type SyncBatchRequest = z.infer<typeof syncBatchRequestSchema>;
export type SyncBatchResponse = z.infer<typeof syncBatchResponseSchema>;
export type ObsidianRegisterResponse = z.infer<
  typeof obsidianRegisterResponseSchema
>;
export type ObsidianScopeResponse = z.infer<typeof obsidianScopeResponseSchema>;
