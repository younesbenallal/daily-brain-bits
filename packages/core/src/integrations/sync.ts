import { z } from "zod";

const nonEmptyString = z.string().min(1);
const dateTimeNullable = z.string().datetime().nullable().optional();
const dateTimeRequired = z.string().datetime();

export const syncItemUpsertSchema = z.object({
	op: z.literal("upsert"),
	externalId: nonEmptyString,
	title: z.string().optional(),
	contentMarkdown: z.string(),
	contentHash: nonEmptyString,
	updatedAtSource: dateTimeNullable,
	deletedAtSource: dateTimeNullable,
	metadata: z.record(z.string(), z.unknown()).nullable().optional(),
});

export const syncItemDeleteSchema = z.object({
	op: z.literal("delete"),
	externalId: nonEmptyString,
	title: z.string().optional(),
	updatedAtSource: dateTimeNullable,
	deletedAtSource: dateTimeRequired,
	metadata: z.record(z.string(), z.unknown()).nullable().optional(),
});

export const syncItemSchema = z.discriminatedUnion("op", [syncItemUpsertSchema, syncItemDeleteSchema]);

export const syncCursorSchema = z.record(z.string(), z.unknown());

export type SyncItem = z.infer<typeof syncItemSchema>;
export type SyncCursor = z.infer<typeof syncCursorSchema>;

export type SyncStats = {
	items: number;
	upserts: number;
	deletes: number;
	skipped: number;
};

export type SyncResult<Cursor = SyncCursor> = {
	items: SyncItem[];
	nextCursor: Cursor;
	stats: SyncStats;
};

export type IntegrationSyncAdapter<Scope, Cursor = SyncCursor> = {
	kind: "notion" | "obsidian";
	sync: (scope: Scope, cursor?: Cursor) => Promise<SyncResult<Cursor>>;
};
