import { db, integrationConnections } from "@daily-brain-bits/db";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { apiKey } from "better-auth/plugins";

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
	],
	databaseHooks: {
		account: {
			create: {
				after: async (account) => {
					console.log("account create", account);
					if (account.providerId !== "notion") {
						return;
					}

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
				},
			},
			update: {
				after: async (account) => {
					console.log("account update", account);
					if (account.providerId !== "notion") {
						return;
					}

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
		google: {
			clientId: process.env.GOOGLE_CLIENT_ID as string,
			clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
		},
		apple: {
			clientId: process.env.APPLE_CLIENT_ID as string,
			clientSecret: process.env.APPLE_CLIENT_SECRET as string,
		},
		notion: {
			clientId: process.env.NOTION_CLIENT_ID as string,
			clientSecret: process.env.NOTION_CLIENT_SECRET as string,
		},
	},
});
