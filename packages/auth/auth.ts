import { PLANS } from "@daily-brain-bits/core";
import { billingSubscriptions, db, emailSequenceStates, integrationConnections } from "@daily-brain-bits/db";
import { configure, tasks } from "@trigger.dev/sdk/v3";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { apiKey } from "better-auth/plugins";
import { and, eq, inArray, sql } from "drizzle-orm";
import { createPolarPlugin } from "./polar";

const polarPlugin = createPolarPlugin();
const billingEnabled = process.env.DEPLOYMENT_MODE !== "self-hosted";

if (!polarPlugin && billingEnabled && process.env.NODE_ENV === "production") {
	throw new Error("POLAR_ACCESS_TOKEN is required to enable the Polar plugin in production.");
}

/**
 * Saves the onboarding sequence state to the database.
 * - Inserts an active onboarding sequence entry
 * - Exits any active welcome sequence (user connected an integration)
 *
 * Note: This function is duplicated from apps/back/infra/trigger-client.ts
 * because packages cannot import from apps. Keep implementations in sync.
 */
async function saveOnboardingSequenceEntry(userId: string) {
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
 * Note: This function is duplicated from apps/back/infra/trigger-client.ts
 * because packages cannot import from apps. Keep implementations in sync.
 */
async function activateOnboardingSequence(userId: string) {
	await saveOnboardingSequenceEntry(userId);
	await triggerSequenceRun({
		userId,
		sequenceName: "onboarding",
	});
}

async function checkSourceLimitForNotionConnection(userId: string) {
	if (!billingEnabled) {
		return;
	}

	const [subscription] = await db
		.select({ id: billingSubscriptions.id })
		.from(billingSubscriptions)
		.where(and(eq(billingSubscriptions.userId, userId), inArray(billingSubscriptions.status, ["active", "trialing"])))
		.limit(1);
	const limit = subscription ? PLANS.pro.limits.maxSources : PLANS.free.limits.maxSources;

	if (limit === Number.POSITIVE_INFINITY) {
		return;
	}

	const [row] = await db
		.select({ count: sql<number>`count(${integrationConnections.id})`.mapWith(Number) })
		.from(integrationConnections)
		.where(and(eq(integrationConnections.userId, userId), eq(integrationConnections.status, "active")))
		.limit(1);

	const currentCount = row?.count ?? 0;
	if (currentCount >= limit) {
		throw new Error("source_limit_reached");
	}
}

let triggerConfigured = false;

// Note: Functions below are duplicated from apps/back/infra/trigger-client.ts
// because packages cannot import from apps. Keep implementations in sync.

function isEmailSequencesEnabled(): boolean {
	return process.env.DEPLOYMENT_MODE !== "self-hosted";
}

/**
 * Lazily configures Trigger.dev SDK if not already configured.
 * @returns true if Trigger.dev is configured and ready, false if TRIGGER_SECRET_KEY is missing.
 */
function tryConfigureTrigger(): boolean {
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

async function triggerSequenceRun(params: { userId: string; sequenceName: "welcome" | "onboarding" | "upgrade" }) {
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

export const auth = betterAuth({
	database: drizzleAdapter(db, {
		provider: "pg", // or "mysql", "sqlite"
	}),
	account: {
		accountLinking: {
			enabled: true,
			allowDifferentEmails: true,
			trustedProviders: ["notion"],
		},
	},
	trustedOrigins: [process.env.FRONTEND_URL || "http://localhost:3000"],
	emailAndPassword: {
		enabled: true,
	},
	plugins: [
		apiKey({
			enableMetadata: true,
		}),
		...(polarPlugin ? [polarPlugin] : []),
	],
	databaseHooks: {
		user: {
			create: {
				after: async (userRecord) => {
					const now = new Date();
					await db
						.insert(emailSequenceStates)
						.values({
							userId: userRecord.id,
							sequenceName: "welcome",
							currentStep: 1,
							status: "active",
							enteredAt: now,
						})
						.onConflictDoNothing();

					await triggerSequenceRun({
						userId: userRecord.id,
						sequenceName: "welcome",
					});
				},
			},
		},
		account: {
			create: {
				after: async (account) => {
					// Auto-verify email for social OAuth providers (Google, Notion)
					if (account.providerId === "google" || account.providerId === "notion") {
						await db.execute(sql`UPDATE "user" SET email_verified = true WHERE id = ${account.userId} AND email_verified = false`);
					}

					// Create integration connection for Notion
					if (account.providerId !== "notion") {
						return;
					}

					await checkSourceLimitForNotionConnection(account.userId);

					const now = new Date();
					await db
						.insert(integrationConnections)
						.values({
							userId: account.userId,
							kind: "notion",
							status: "active",
							displayName: null,
							accountExternalId: account.accountId,
							configJson: null,
							secretsJsonEncrypted: null,
							updatedAt: now,
							lastSeenAt: now,
						})
						.onConflictDoUpdate({
							target: [integrationConnections.userId, integrationConnections.kind, integrationConnections.accountExternalId],
							set: {
								status: "active",
								updatedAt: now,
								lastSeenAt: now,
							},
						});

					await activateOnboardingSequence(account.userId);
				},
			},
			update: {
				after: async (account) => {
					// same
					if (account.providerId !== "notion") {
						return;
					}

					await checkSourceLimitForNotionConnection(account.userId);

					const now = new Date();
					await db
						.insert(integrationConnections)
						.values({
							userId: account.userId,
							kind: "notion",
							status: "active",
							displayName: null,
							accountExternalId: account.accountId,
							configJson: null,
							secretsJsonEncrypted: null,
							updatedAt: now,
							lastSeenAt: now,
						})
						.onConflictDoUpdate({
							target: [integrationConnections.userId, integrationConnections.kind, integrationConnections.accountExternalId],
							set: {
								status: "active",
								updatedAt: now,
								lastSeenAt: now,
							},
						});

					await activateOnboardingSequence(account.userId);
				},
			},
		},
	},
	user: {
		additionalFields: {
			showOnboarding: {
				type: "boolean",
				default: true,
				required: true,
				description: "Whether the user has completed onboarding",
			},
		},
	},
	socialProviders: {
		...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
			? {
					google: {
						clientId: process.env.GOOGLE_CLIENT_ID,
						clientSecret: process.env.GOOGLE_CLIENT_SECRET,
						getUserInfo: async (token) => {
							const response = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
								headers: { Authorization: `Bearer ${token.accessToken}` },
							});
							const profile = (await response.json()) as {
								id: string;
								name: string;
								email: string;
								picture: string;
								verified_email: boolean;
							};
							return {
								user: {
									id: profile.id,
									name: profile.name,
									email: profile.email,
									image: profile.picture,
									emailVerified: profile.verified_email,
								},
								data: profile,
							};
						},
					},
				}
			: {}),
		...(process.env.NOTION_CLIENT_ID && process.env.NOTION_CLIENT_SECRET
			? {
					notion: {
						clientId: process.env.NOTION_CLIENT_ID,
						clientSecret: process.env.NOTION_CLIENT_SECRET,
					},
				}
			: {}),
	},
});
