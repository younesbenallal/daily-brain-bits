import { PLANS } from "@daily-brain-bits/core";
import { db, emailSends } from "@daily-brain-bits/db";
import * as React from "react";
import { env } from "../../infra/env";
import { clampIntervalToLimits } from "../digest/schedule";
import { sendResendEmail } from "./resend";
import { buildSequenceEmail, type SequenceEmailId } from "./sequence-templates";
import type { EmailSequenceName } from "./sequence-schedule";
import type { DigestStats, IntegrationSummary, UserRow } from "./sequence-context";

const DEFAULT_SURVEY_PATH = "/feedback";
const DEFAULT_UPGRADE_PATH = "/settings?tab=billing";

type SequenceSettings = {
	digestIntervalDays: number;
	notesPerDigest: number;
	quizEnabled: boolean;
};

export function buildTemplateParams(options: {
	user: UserRow;
	settings: SequenceSettings;
	integrationSummary: IntegrationSummary;
	digestStats?: DigestStats;
	isPro: boolean;
}) {
	const greetingName = formatFirstName(options.user.name);
	const sourceName = options.integrationSummary.primaryKind === "notion" ? "Notion" : options.integrationSummary.primaryKind === "obsidian" ? "Obsidian" : undefined;
	const limits = options.isPro ? PLANS.pro.limits : PLANS.free.limits;
	const effectiveIntervalDays = clampIntervalToLimits({
		requested: options.settings.digestIntervalDays,
		limits,
	});
	const digestTiming = formatDigestTiming(effectiveIntervalDays);

	return {
		firstName: greetingName,
		frontendUrl: env.FRONTEND_URL,
		founderEmail: "younes@notionist.app",
		sourceName,
		digestTiming,
		notesPerDigest: options.settings.notesPerDigest,
		totalNoteCount: options.digestStats?.noteCount ?? 0,
		digestCount: options.digestStats?.digestCount ?? 0,
		isPro: options.isPro,
		surveyUrl: buildFrontendUrl(env.FRONTEND_URL, DEFAULT_SURVEY_PATH),
		upgradeUrl: buildFrontendUrl(env.FRONTEND_URL, DEFAULT_UPGRADE_PATH),
	};
}

export function formatDigestTiming(intervalDays: number): string {
	if (intervalDays <= 1) {
		return "tomorrow morning";
	}
	if (intervalDays <= 3) {
		return "in a few days";
	}
	if (intervalDays <= 7) {
		return "later this week";
	}
	if (intervalDays <= 14) {
		return "next week";
	}
	return "this month";
}

export function formatFirstName(name?: string | null): string {
	if (!name) {
		return "there";
	}
	const trimmed = name.trim();
	if (!trimmed) {
		return "there";
	}
	return trimmed.split(/\s+/)[0] ?? "there";
}

export function buildSequenceIdempotencyKey(sequenceName: EmailSequenceName, userId: string, step: number) {
	const raw = `sequence-${sequenceName}-${userId}-${step}`;
	if (raw.length <= 256) {
		return raw;
	}
	return raw.slice(0, 256);
}

export async function sendSequenceEmail(params: {
	user: UserRow;
	emailId: SequenceEmailId;
	subject: string;
	react: React.ReactElement;
	text: string;
	idempotencyKey: string;
	dryRun: boolean;
	sequenceName: EmailSequenceName;
}) {
	const tags = [
		{ name: "email_type", value: "sequence" },
		{ name: "sequence", value: params.sequenceName },
		{ name: "step", value: String(params.emailId) },
	];

	return sendResendEmail({
		payload: {
			from: env.RESEND_FROM,
			to: params.user.email,
			subject: params.subject,
			react: params.react,
			text: params.text,
			replyTo: env.RESEND_REPLY_TO ?? undefined,
			tags: tags.map((tag) => ({ name: tag.name, value: sanitizeTagValue(tag.value) })),
		},
		idempotencyKey: params.idempotencyKey,
		dryRun: params.dryRun || env.SEQUENCE_EMAIL_DRY_RUN,
		retry: { maxRetries: 3, initialDelayMs: 1000 },
	});
}

export async function recordSequenceSend(params: {
	userId: string;
	emailId: SequenceEmailId;
	sequenceName: EmailSequenceName;
	idempotencyKey: string;
	resendId: string | null;
	payloadJson: Record<string, unknown>;
}) {
	await db
		.insert(emailSends)
		.values({
			userId: params.userId,
			sequenceName: params.sequenceName,
			emailName: params.emailId,
			idempotencyKey: params.idempotencyKey,
			resendId: params.resendId,
			payloadJson: params.payloadJson,
		})
		.onConflictDoNothing();
}

export function sanitizeTagValue(value: string) {
	return value.replace(/[^A-Za-z0-9_-]/g, "-").slice(0, 256);
}

export function buildFrontendUrl(frontendUrl: string, path: string) {
	const base = frontendUrl.replace(/\/$/, "");
	if (!path.startsWith("/")) {
		return `${base}/${path}`;
	}
	return `${base}${path}`;
}

export { buildSequenceEmail };
