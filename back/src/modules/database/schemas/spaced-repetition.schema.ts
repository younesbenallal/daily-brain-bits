import {
  pgTable,
  serial,
  varchar,
  text,
  integer,
  timestamp,
  boolean,
  real,
  jsonb,
} from "drizzle-orm/pg-core";
import { users } from "../../../../modules/users/user.schema";

// Table pour les cartes Notion
export const cards = pgTable("cards", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .references(() => users.id)
    .notNull(),
  notionPageId: varchar("notion_page_id", { length: 255 }).notNull().unique(),
  notionDatabaseId: varchar("notion_database_id", { length: 255 }).notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  content: text("content"),
  tags: jsonb("tags").$type<string[]>().default([]),
  difficulty: integer("difficulty").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

// Table pour les révisions
export const reviews = pgTable("reviews", {
  id: serial("id").primaryKey(),
  cardId: integer("card_id")
    .references(() => cards.id)
    .notNull(),
  userId: integer("user_id")
    .references(() => users.id)
    .notNull(),
  quality: integer("quality").notNull(), // 0-5 (SM-2 algorithm)
  easinessFactor: real("easiness_factor").default(2.5),
  interval: integer("interval").default(1), // en jours
  repetition: integer("repetition").default(0),
  nextReviewDate: timestamp("next_review_date").notNull(),
  reviewedAt: timestamp("reviewed_at").defaultNow().notNull(),
});

// Table pour les paramètres de révision par utilisateur
export const spacedRepetitionSettings = pgTable("spaced_repetition_settings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .references(() => users.id)
    .notNull()
    .unique(),
  cardsPerDay: integer("cards_per_day").default(10),
  maxReviewsPerDay: integer("max_reviews_per_day").default(50),
  notificationTime: varchar("notification_time", { length: 5 }).default(
    "09:00"
  ), // HH:MM
  notificationsEnabled: boolean("notifications_enabled").default(true),
  studyDays: jsonb("study_days").$type<number[]>().default([1, 2, 3, 4, 5]), // 1=lundi, 7=dimanche
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

// Types inférés
export type Card = typeof cards.$inferSelect;
export type NewCard = typeof cards.$inferInsert;
export type UpdateCard = Partial<NewCard>;

export type Review = typeof reviews.$inferSelect;
export type NewReview = typeof reviews.$inferInsert;
export type UpdateReview = Partial<NewReview>;

export type SpacedRepetitionSettings =
  typeof spacedRepetitionSettings.$inferSelect;
export type NewSpacedRepetitionSettings =
  typeof spacedRepetitionSettings.$inferInsert;
export type UpdateSpacedRepetitionSettings =
  Partial<NewSpacedRepetitionSettings>;
