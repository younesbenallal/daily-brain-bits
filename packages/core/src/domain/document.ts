import { z } from "zod";

export const documentSourceSchema = z.object({
  kind: z.enum(["obsidian", "notion"]),
  accountId: z.string().min(1),
  externalId: z.string().min(1),
});

export const documentSchema = z.object({
  documentId: z.string().uuid(),
  userId: z.string().min(1),
  source: documentSourceSchema,
  title: z.string(),
  contentMarkdown: z.string(),
  contentHash: z.string(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  createdAtSource: z.string().datetime().nullable(),
  updatedAtSource: z.string().datetime().nullable(),
  deletedAtSource: z.string().datetime().nullable(),
  syncedAt: z.string().datetime(),
  version: z.number().int(),
});

export type Document = z.infer<typeof documentSchema>;
