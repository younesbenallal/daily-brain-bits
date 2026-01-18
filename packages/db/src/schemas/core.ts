import { boolean, doublePrecision, index, integer, jsonb, pgEnum, pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const integrationKind = pgEnum("integration_kind", ["obsidian", "notion"]);

export const integrationStatus = pgEnum("integration_status", ["active", "paused", "revoked", "error"]);

export const integrationScopeType = pgEnum("integration_scope_type", ["notion_database"]);

export const integrationConnections = pgTable(
	"integration_connections",
	{
		id: serial("id").primaryKey(),
		userId: text("user_id").notNull(),
		kind: integrationKind("kind").notNull(),
		status: integrationStatus("status").notNull(),
		displayName: text("display_name"),
		accountExternalId: text("account_external_id").notNull(),
		configJson: jsonb("config_json"),
		secretsJsonEncrypted: text("secrets_json_encrypted"),
		createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
		lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
	},
	(table) => [
		uniqueIndex("integration_connections_user_kind_external_idx").on(table.userId, table.kind, table.accountExternalId),
		index("integration_connections_user_kind_status_idx").on(table.userId, table.kind, table.status),
		index("integration_connections_user_last_seen_idx").on(table.userId, table.lastSeenAt),
	],
);

export const integrationScopeItems = pgTable(
	"integration_scope_items",
	{
		id: serial("id").primaryKey(),
		connectionId: integer("connection_id")
			.notNull()
			.references(() => integrationConnections.id, { onDelete: "cascade" }),
		scopeType: integrationScopeType("scope_type").notNull(),
		scopeValue: text("scope_value").notNull(),
		enabled: boolean("enabled").notNull(),
		metadataJson: jsonb("metadata_json"),
		createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
	},
	(table) => [
		uniqueIndex("integration_scope_items_connection_type_value_idx").on(table.connectionId, table.scopeType, table.scopeValue),
		index("integration_scope_items_connection_enabled_idx").on(table.connectionId, table.enabled),
	],
);

export const documents = pgTable(
	"documents",
	{
		id: serial("id").primaryKey(),
		userId: text("user_id").notNull(),
		connectionId: integer("connection_id")
			.notNull()
			.references(() => integrationConnections.id, { onDelete: "cascade" }),
		externalId: text("external_id").notNull(),
		title: text("title"),
		contentCiphertext: text("content_ciphertext").notNull(),
		contentIv: text("content_iv").notNull(),
		contentAlg: text("content_alg").notNull(),
		contentKeyVersion: integer("content_key_version").notNull(),
		contentHash: text("content_hash").notNull(),
		contentSizeBytes: integer("content_size_bytes").notNull(),
		metadataJson: jsonb("metadata_json"),
		createdAtSource: timestamp("created_at_source", { withTimezone: true }),
		updatedAtSource: timestamp("updated_at_source", { withTimezone: true }),
		deletedAtSource: timestamp("deleted_at_source", { withTimezone: true }),
		lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
	},
	(table) => [
		uniqueIndex("documents_user_connection_external_idx").on(table.userId, table.connectionId, table.externalId),
		index("documents_user_deleted_at_source_idx").on(table.userId, table.deletedAtSource),
		index("documents_connection_updated_at_source_idx").on(table.connectionId, table.updatedAtSource),
		index("documents_user_last_synced_at_idx").on(table.userId, table.lastSyncedAt),
	],
);

export const syncRunKind = pgEnum("sync_run_kind", ["initial", "incremental", "manual"]);

export const syncRunStatus = pgEnum("sync_run_status", ["running", "success", "failed", "partial"]);

export const syncState = pgTable(
	"sync_state",
	{
		connectionId: integer("connection_id")
			.primaryKey()
			.references(() => integrationConnections.id, { onDelete: "cascade" }),
		lastFullSyncAt: timestamp("last_full_sync_at", { withTimezone: true }),
		lastIncrementalSyncAt: timestamp("last_incremental_sync_at", {
			withTimezone: true,
		}),
		cursorJson: jsonb("cursor_json"),
		backoffUntil: timestamp("backoff_until", { withTimezone: true }),
		healthJson: jsonb("health_json"),
		updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
	},
	(table) => [index("sync_state_backoff_until_idx").on(table.backoffUntil)],
);

export const syncRuns = pgTable(
	"sync_runs",
	{
		id: serial("id").primaryKey(),
		connectionId: integer("connection_id")
			.notNull()
			.references(() => integrationConnections.id, { onDelete: "cascade" }),
		kind: syncRunKind("kind").notNull(),
		status: syncRunStatus("status").notNull(),
		statsJson: jsonb("stats_json"),
		errorJson: jsonb("error_json"),
		startedAt: timestamp("started_at", { withTimezone: true }),
		finishedAt: timestamp("finished_at", { withTimezone: true }),
		createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
	},
	(table) => [
		index("sync_runs_connection_started_at_idx").on(table.connectionId, table.startedAt),
		index("sync_runs_status_started_at_idx").on(table.status, table.startedAt),
	],
);

export const reviewStatus = pgEnum("review_status", ["new", "reviewing", "suspended"]);

export const reviewStates = pgTable(
	"review_states",
	{
		documentId: integer("document_id")
			.primaryKey()
			.references(() => documents.id, { onDelete: "cascade" }),
		userId: text("user_id").notNull(),
		status: reviewStatus("status").notNull(),
		priorityWeight: doublePrecision("priority_weight"),
		deprioritizedUntil: timestamp("deprioritized_until", {
			withTimezone: true,
		}),
		lastSentAt: timestamp("last_sent_at", { withTimezone: true }),
		lastReviewedAt: timestamp("last_reviewed_at", { withTimezone: true }),
		nextDueAt: timestamp("next_due_at", { withTimezone: true }),
		schedulingJson: jsonb("scheduling_json"),
		intervalDays: integer("interval_days"),
		easeFactor: doublePrecision("ease_factor"),
		repetitions: integer("repetitions"),
		updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
	},
	(table) => [
		index("review_states_user_next_due_idx").on(table.userId, table.nextDueAt),
		index("review_states_user_status_idx").on(table.userId, table.status),
	],
);

export const reviewEvents = pgTable(
	"review_events",
	{
		id: serial("id").primaryKey(),
		userId: text("user_id").notNull(),
		documentId: integer("document_id")
			.notNull()
			.references(() => documents.id, { onDelete: "cascade" }),
		type: text("type").notNull(),
		payloadJson: jsonb("payload_json"),
		createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
	},
	(table) => [
		index("review_events_user_created_at_idx").on(table.userId, table.createdAt),
		index("review_events_document_created_at_idx").on(table.documentId, table.createdAt),
	],
);

export const digestFrequency = pgEnum("digest_frequency", ["daily", "weekly", "monthly"]);

export const userSettings = pgTable(
	"user_settings",
	{
		userId: text("user_id").primaryKey(),
		emailFrequency: digestFrequency("email_frequency").notNull().default("daily"),
		notesPerDigest: integer("notes_per_digest").notNull().default(5),
		quizEnabled: boolean("quiz_enabled").notNull().default(false),
		createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
	},
	(table) => [index("user_settings_email_frequency_idx").on(table.emailFrequency)],
);

export const billingCustomers = pgTable(
	"billing_customers",
	{
		userId: text("user_id").primaryKey(),
		polarCustomerId: text("polar_customer_id").notNull(),
		email: text("email"),
		metadataJson: jsonb("metadata_json"),
		createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
	},
	(table) => [uniqueIndex("billing_customers_polar_customer_id_idx").on(table.polarCustomerId)],
);

export const billingSubscriptions = pgTable(
	"billing_subscriptions",
	{
		id: text("id").primaryKey(),
		userId: text("user_id").notNull(),
		polarCustomerId: text("polar_customer_id"),
		productId: text("product_id"),
		priceId: text("price_id"),
		status: text("status").notNull(),
		currentPeriodStart: timestamp("current_period_start", { withTimezone: true }),
		currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
		cancelAtPeriodEnd: boolean("cancel_at_period_end"),
		canceledAt: timestamp("canceled_at", { withTimezone: true }),
		endedAt: timestamp("ended_at", { withTimezone: true }),
		metadataJson: jsonb("metadata_json"),
		createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
	},
	(table) => [
		index("billing_subscriptions_user_id_idx").on(table.userId),
		index("billing_subscriptions_status_idx").on(table.status),
		index("billing_subscriptions_customer_idx").on(table.polarCustomerId),
	],
);

export const noteDigestStatus = pgEnum("note_digest_status", ["scheduled", "sent", "failed", "skipped"]);

export const noteDigests = pgTable(
	"note_digests",
	{
		id: serial("id").primaryKey(),
		userId: text("user_id").notNull(),
		scheduledFor: timestamp("scheduled_for", { withTimezone: true }),
		sentAt: timestamp("sent_at", { withTimezone: true }),
		status: noteDigestStatus("status").notNull(),
		payloadJson: jsonb("payload_json"),
		errorJson: jsonb("error_json"),
		createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
	},
	(table) => [
		index("note_digests_user_scheduled_for_idx").on(table.userId, table.scheduledFor),
		index("note_digests_status_scheduled_for_idx").on(table.status, table.scheduledFor),
	],
);

export const noteDigestItems = pgTable(
	"note_digest_items",
	{
		id: serial("id").primaryKey(),
		noteDigestId: integer("note_digest_id")
			.notNull()
			.references(() => noteDigests.id, { onDelete: "cascade" }),
		documentId: integer("document_id")
			.notNull()
			.references(() => documents.id, { onDelete: "cascade" }),
		position: integer("position").notNull(),
		contentHashAtSend: text("content_hash_at_send").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
	},
	(table) => [
		uniqueIndex("note_digest_items_digest_document_idx").on(table.noteDigestId, table.documentId),
		index("note_digest_items_digest_position_idx").on(table.noteDigestId, table.position),
	],
);
