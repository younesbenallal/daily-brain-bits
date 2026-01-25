import { db, emailSequenceStates } from "@daily-brain-bits/db";
import { configure, tasks } from "@trigger.dev/sdk/v3";
import { and, eq } from "drizzle-orm";

let triggerConfigured = false;

export function isEmailSequencesEnabled(): boolean {
	if (!process.env.EMAIL_SEQUENCES_ENABLED) {
		return true;
	}
	return process.env.EMAIL_SEQUENCES_ENABLED.toLowerCase() !== "false";
}

export function ensureTriggerConfigured(): boolean {
	if (triggerConfigured) {
		return true;
	}
	const secretKey = process.env.TRIGGER_SECRET_KEY;
	if (!secretKey) {
		return false;
	}

	configure({
		secretKey,
		baseURL: process.env.TRIGGER_API_URL || undefined,
	});
	triggerConfigured = true;
	return true;
}

export async function triggerSequenceRun(params: { userId: string; sequenceName: "welcome" | "onboarding" | "upgrade" }) {
	if (!isEmailSequencesEnabled()) {
		return;
	}
	if (!ensureTriggerConfigured()) {
		console.warn("[email-sequences] trigger skipped: TRIGGER_SECRET_KEY not configured");
		return;
	}

	await tasks.trigger(
		"email-sequence-runner",
		{
			userId: params.userId,
			sequenceName: params.sequenceName,
		},
		{
			idempotencyKey: `sequence-run-${params.sequenceName}-${params.userId}`,
		},
	);
}

export async function enterOnboardingSequence(userId: string) {
	const now = new Date();
	await db
		.insert(emailSequenceStates)
		.values({
			userId,
			sequenceName: "onboarding",
			currentStep: 1,
			status: "active",
			enteredAt: now,
		})
		.onConflictDoNothing();

	await db
		.update(emailSequenceStates)
		.set({
			status: "exited",
			exitReason: "connected",
			completedAt: now,
		})
		.where(and(eq(emailSequenceStates.userId, userId), eq(emailSequenceStates.sequenceName, "welcome"), eq(emailSequenceStates.status, "active")));

	await triggerSequenceRun({
		userId,
		sequenceName: "onboarding",
	});
}
