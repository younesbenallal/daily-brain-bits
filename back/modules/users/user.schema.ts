import {
  pgTable,
  serial,
  varchar,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: varchar("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()), // Better Auth utilise des UUIDs
  email: varchar("email", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  emailVerified: boolean("emailVerified").notNull().default(false), // Requis par Better Auth
  image: varchar("image", { length: 500 }), // Optionnel pour Better Auth
  password: varchar("password", { length: 255 }), // Optionnel maintenant
  betterAuthId: varchar("better_auth_id", { length: 255 }).unique(), // ID Better Auth
  token: varchar("token", { length: 500 }), // Token Better Auth
  notionToken: varchar("notion_token", { length: 500 }), // Token Notion
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(), // Better Auth utilise "createdAt"
  updatedAt: timestamp("updatedAt").defaultNow().notNull(), // Better Auth utilise "updatedAt"
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type UpdateUser = Partial<NewUser>;
