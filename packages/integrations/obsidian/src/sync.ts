import { z } from "zod";

const nonEmptyString = z.string().min(1);

export const syncItemUpsertSchema = z.object({
  op: z.literal("upsert"),
  externalId: nonEmptyString,
  path: nonEmptyString,
  title: z.string().optional(),
  contentMarkdown: nonEmptyString,
  updatedAtSource: z.string().datetime().optional(),
  contentHash: nonEmptyString,
  metadata: z.record(z.unknown()).optional(),
});

export const syncItemDeleteSchema = z.object({
  op: z.literal("delete"),
  externalId: nonEmptyString,
  path: nonEmptyString,
  title: z.string().optional(),
  updatedAtSource: z.string().datetime().optional(),
  metadata: z.record(z.unknown()).optional(),
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

export type SyncItemUpsert = z.infer<typeof syncItemUpsertSchema>;
export type SyncItemDelete = z.infer<typeof syncItemDeleteSchema>;
export type SyncItem = z.infer<typeof syncItemSchema>;
export type SyncBatchRequest = z.infer<typeof syncBatchRequestSchema>;
export type SyncBatchResponse = z.infer<typeof syncBatchResponseSchema>;
export type ObsidianRegisterResponse = z.infer<
  typeof obsidianRegisterResponseSchema
>;
