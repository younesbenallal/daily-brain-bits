import { db, emailSequenceStates } from "@daily-brain-bits/db";
import { configure, tasks } from "@trigger.dev/sdk/v3";
import { and, eq } from "drizzle-orm";
import { getDeploymentMode } from "../domains/billing/deployment-mode";

let triggerConfigured = false;

export function isEmailSequencesEnabled(): boolean {
	return getDeploymentMode() !== "self-hosted";
}

/**
 * Lazily configures Trigger.dev SDK if not already configured.
 * @returns true if Trigger.dev is configured and ready, false if TRIGGER_SECRET_KEY is missing.
 */
export function tryConfigureTrigger(): boolean {
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
	if (!tryConfigureTrigger()) {
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

export async function triggerDigestSend(params: { userId: string; reason?: string }) {
	if (!tryConfigureTrigger()) {
		console.warn("[digest] trigger skipped: TRIGGER_SECRET_KEY not configured");
		return;
	}

	await tasks.trigger(
		"digest-send-for-user",
		{
			userId: params.userId,
			reason: params.reason,
		},
		{
			idempotencyKey: `digest-send-${params.userId}-${params.reason ?? "first"}`,
		},
	);
}

/**
 * Saves the onboarding sequence state to the database.
 * - Inserts an active onboarding sequence entry
 * - Exits any active welcome sequence (user connected an integration)
 *
 * Note: This function is duplicated in packages/auth/auth.ts because packages
 * cannot import from apps. Changes here should be synced with the auth package.
 */
export async function saveOnboardingSequenceEntry(userId: string) {
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
}

/**
 * Activates the onboarding sequence for a user.
 * Saves the sequence state to the database and triggers the sequence runner job.
 *
 * Note: This function is duplicated in packages/auth/auth.ts because packages
 * cannot import from apps. Changes here should be synced with the auth package.
 */
export async function activateOnboardingSequence(userId: string) {
	await saveOnboardingSequenceEntry(userId);
	await triggerSequenceRun({
		userId,
		sequenceName: "onboarding",
	});
}
