import { pgTable, varchar, timestamp, text } from "drizzle-orm/pg-core";
import { integrations } from "./integrations.schema";
import { notionDatabases } from "./notion-databases.schema";

export const notionPages = pgTable("notion_pages", {
  id: varchar("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  integrationId: varchar("integration_id", { length: 255 })
    .notNull()
    .references(() => integrations.id, { onDelete: "cascade" }),
  databaseId: varchar("database_id", { length: 255 }).notNull(), // ID de la base de données Notion
  pageId: varchar("page_id", { length: 255 }).notNull(), // ID de la page Notion
  pageTitle: text("page_title"), // Titre de la page pour référence
  pageUrl: text("page_url"), // URL de la page pour référence
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type NotionPage = typeof notionPages.$inferSelect;
export type NewNotionPage = typeof notionPages.$inferInsert;
export type UpdateNotionPage = Partial<NewNotionPage>;
