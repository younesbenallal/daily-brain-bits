import { pgTable, text, integer, varchar, serial, json, date, pgEnum, boolean } from "drizzle-orm/pg-core";

export const emailFrequency = pgEnum("email_frequency_enum", ["daily", "weekly"]);

export const user = pgTable("users", {
	id: serial("id").primaryKey(),
	email: varchar("email", { length: 255 }).notNull(),
	numberNotesPerEmail: integer("number_notes_per_email").default(5),
	emailFrequency: emailFrequency("email_frequency").default("daily"),
	openAIToken: text("open_ai_token"),
	timeZone: varchar("time_zone", { length: 255 }),
	learningMode: boolean("learning_mode").default(false),
});

export const note = pgTable("notes", {
	id: serial("id").primaryKey(),
	title: text("title").notNull(),
	content: text("content").notNull(),
	properties: json("properties").notNull(),
	createdAt: date("created_at").notNull().defaultNow(),
	updatedAt: date("updated_at").notNull().defaultNow(),
	suggestionLikelihood: integer("suggestion_likelihood").default(1),
	lastSent: date("last_sent"),

	userId: integer("user_id").references(() => user.id),

	//linkedNotes: array("related_notes", "Note[]"), // Assuming 'Note[]' is a supported array type
});

export const providerName = pgEnum("provider_name_type", ["notion", "obsidian"]);

export const integration = pgTable("integrations", {
	id: serial("id").primaryKey(),
	providerName: providerName("provider_name").notNull(),
	tokens: json("tokens").notNull(),
});
