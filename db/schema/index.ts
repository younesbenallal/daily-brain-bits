import { relations } from "drizzle-orm";
import { pgTable, text, integer, varchar, serial, json, date, pgEnum, boolean } from "drizzle-orm/pg-core";

export const emailFrequency = pgEnum("email_frequency_enum", ["daily", "weekly"]);

export const users = pgTable("users", {
	id: varchar("id").primaryKey(),
	email: varchar("email", { length: 255 }).notNull(),
	numberNotesPerEmail: integer("number_notes_per_email").default(5),
	emailFrequency: emailFrequency("email_frequency").default("daily"),
	openAIToken: text("open_ai_token"),
	timeZone: varchar("time_zone", { length: 255 }),
	apiKey: varchar("api_key", { length: 255 }).notNull(),
	learningMode: boolean("learning_mode").default(false),
	isOnboarded: boolean("is_onboarded").default(false),
});

export const usersRelations = relations(users, ({ many }) => ({
	notes: many(notes),
	sources: many(sources),
}));

export type User = typeof users.$inferSelect;

export const notes = pgTable("notes", {
	id: serial("id").primaryKey(),
	title: text("title").notNull(),
	content: text("content").notNull(),
	properties: json("properties"),
	createdAt: date("created_at").notNull().defaultNow(),
	updatedAt: date("updated_at").notNull().defaultNow(),
	suggestionLikelihood: integer("suggestion_likelihood").default(1),
	lastSent: date("last_sent"),

	userId: varchar("user_id").references(() => users.id),
	//linkedNotes: array("related_notes", "Note[]"), // Assuming 'Note[]' is a supported array type
});

export const notesRelations = relations(notes, ({ one }) => ({
	user: one(users, {
		fields: [notes.userId],
		references: [users.id],
	}),
}));

export type Note = typeof notes.$inferSelect;

export const sourceName = pgEnum("source_name_type", ["notion", "obsidian"]);

export const sources = pgTable("sources", {
	id: serial("id").primaryKey(),
	name: sourceName("name").notNull(),
	tokens: json("tokens"),

	userId: varchar("user_id").references(() => users.id),
});

export const sourcesRelations = relations(sources, ({ one }) => ({
	user: one(users, {
		fields: [sources.userId],
		references: [users.id],
	}),
}));
