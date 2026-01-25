import { index, integer, jsonb, pgEnum, pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { user } from "./auth";

export const emailSequenceName = pgEnum("email_sequence_name", ["welcome", "onboarding", "upgrade"]);
export const emailSequenceStatus = pgEnum("email_sequence_status", ["active", "completed", "exited"]);

export const emailSequenceStates = pgTable(
	"email_sequence_states",
	{
		id: serial("id").primaryKey(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		sequenceName: emailSequenceName("sequence_name").notNull(),
		currentStep: integer("current_step").notNull().default(1),
		status: emailSequenceStatus("status").notNull().default("active"),
		enteredAt: timestamp("entered_at", { withTimezone: true }).notNull().defaultNow(),
		lastEmailSentAt: timestamp("last_email_sent_at", { withTimezone: true }),
		completedAt: timestamp("completed_at", { withTimezone: true }),
		exitReason: text("exit_reason"),
	},
	(table) => [
		uniqueIndex("email_sequence_states_user_sequence_idx").on(table.userId, table.sequenceName),
		index("email_sequence_states_status_sequence_idx").on(table.status, table.sequenceName),
		index("email_sequence_states_last_sent_idx").on(table.lastEmailSentAt),
	],
);

export const emailSends = pgTable(
	"email_sends",
	{
		id: serial("id").primaryKey(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		sequenceName: emailSequenceName("sequence_name"),
		emailName: text("email_name").notNull(),
		idempotencyKey: text("idempotency_key").notNull(),
		provider: text("provider").notNull().default("resend"),
		resendId: text("resend_id"),
		sentAt: timestamp("sent_at", { withTimezone: true }).notNull().defaultNow(),
		openedAt: timestamp("opened_at", { withTimezone: true }),
		clickedAt: timestamp("clicked_at", { withTimezone: true }),
		payloadJson: jsonb("payload_json"),
	},
	(table) => [
		uniqueIndex("email_sends_idempotency_idx").on(table.idempotencyKey),
		index("email_sends_user_sequence_idx").on(table.userId, table.sequenceName),
		index("email_sends_resend_id_idx").on(table.resendId),
		index("email_sends_email_name_idx").on(table.emailName),
	],
);
