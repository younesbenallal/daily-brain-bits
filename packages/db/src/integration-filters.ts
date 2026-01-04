import { z } from "zod";

const nonEmptyString = z.string().min(1);

export const notionIntegrationFilterSchema = z.object({
  kind: z.literal("notion"),
  databaseIds: z.array(nonEmptyString).min(1),
});

export const obsidianIntegrationFilterSchema = z.object({
  kind: z.literal("obsidian"),
  patterns: z.array(nonEmptyString).min(1),
});

export const integrationFilterSchema = z.discriminatedUnion("kind", [
  notionIntegrationFilterSchema,
  obsidianIntegrationFilterSchema,
]);

export type IntegrationFilter = z.infer<typeof integrationFilterSchema>;
export type NotionIntegrationFilter = z.infer<
  typeof notionIntegrationFilterSchema
>;
export type ObsidianIntegrationFilter = z.infer<
  typeof obsidianIntegrationFilterSchema
>;
