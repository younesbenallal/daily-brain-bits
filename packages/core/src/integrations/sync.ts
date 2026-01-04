import { z } from "zod";

const nonEmptyString = z.string().min(1);
const dateTimeNullable = z.string().datetime().nullable().optional();

export const syncItemSchema = z.object({
  op: z.enum(["upsert", "delete"]),
  externalId: nonEmptyString,
  title: z.string().optional(),
  contentMarkdown: z.string().optional(),
  contentHash: z.string().optional(),
  updatedAtSource: dateTimeNullable,
  deletedAtSource: dateTimeNullable,
  metadata: z.record(z.unknown()).nullable().optional(),
});

export const syncCursorSchema = z.object({
  since: z.string().datetime(),
});

export type SyncItem = z.infer<typeof syncItemSchema>;
export type SyncCursor = z.infer<typeof syncCursorSchema>;

export type SyncStats = {
  items: number;
  upserts: number;
  deletes: number;
  skipped: number;
};

export type SyncResult = {
  items: SyncItem[];
  nextCursor: SyncCursor;
  stats: SyncStats;
};

export type IntegrationSyncAdapter<Scope> = {
  kind: "notion" | "obsidian";
  sync: (scope: Scope, cursor?: SyncCursor) => Promise<SyncResult>;
};
