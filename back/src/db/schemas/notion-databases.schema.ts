import { pgTable, varchar, timestamp, text } from "drizzle-orm/pg-core";
import { integrations } from "./integrations.schema";

export const notionDatabases = pgTable("notion_databases", {
  id: varchar("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  integrationId: varchar("integration_id", { length: 255 })
    .notNull()
    .references(() => integrations.id, { onDelete: "cascade" }),
  databaseId: varchar("database_id", { length: 255 }).notNull(), // ID de la base de données Notion
  databaseTitle: text("database_title"), // Titre de la base de données pour référence
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type NotionDatabase = typeof notionDatabases.$inferSelect;
export type NewNotionDatabase = typeof notionDatabases.$inferInsert;
export type UpdateNotionDatabase = Partial<NewNotionDatabase>;
