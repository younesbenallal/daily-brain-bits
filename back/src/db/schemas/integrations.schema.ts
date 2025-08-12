import {
  pgTable,
  varchar,
  timestamp,
  text,
  jsonb,
  boolean,
} from "drizzle-orm/pg-core";
import { user } from "../../modules/auth/auth.schema";

export const integrations = pgTable("integrations", {
  id: varchar("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: varchar("user_id", { length: 255 })
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 50 }).notNull(), // 'notion', 'obsidian', etc.
  name: varchar("name", { length: 255 }).notNull(), // Nom personnalisé de l'intégration
  accessToken: text("access_token").notNull(), // Token d'accès
  refreshToken: text("refresh_token"), // Token de rafraîchissement (optionnel)
  expiresAt: timestamp("expires_at"), // Date d'expiration du token
  metadata: jsonb("metadata"), // Données supplémentaires spécifiques à l'intégration
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Integration = typeof integrations.$inferSelect;
export type NewIntegration = typeof integrations.$inferInsert;
export type UpdateIntegration = Partial<NewIntegration>;

// Types spécifiques pour les métadonnées
export interface NotionIntegrationMetadata {
  workspaceId: string;
  workspaceName: string;
  workspaceIcon?: string;
  botId: string;
  owner: {
    type: string;
    user?: {
      id: string;
      name: string;
      avatar_url?: string;
      type: string;
      person?: {
        email: string;
      };
    };
  };
  duplicated_template_id?: string;
  request_id: string;
}

export interface ObsidianIntegrationMetadata {
  vaultName: string;
  apiKey: string;
  baseUrl: string;
}
