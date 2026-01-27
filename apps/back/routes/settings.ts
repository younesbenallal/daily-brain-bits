import { db, userSettings } from "@daily-brain-bits/db";
import { ORPCError } from "@orpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { baseRoute } from "../context";
import { isValidTimezone } from "../utils/digest-schedule";
import { getBillingMode, getDeploymentMode, getIsProForUser, isBillingEnabled, getUserEntitlements, countUserConnections, countUserDocuments } from "../utils/entitlements";

const frequencyOptions = ["daily", "weekly", "monthly"] as const;

const timezoneSchema = z.string().refine((tz) => isValidTimezone(tz), {
	message: "Invalid IANA timezone",
});

const settingsSchema = z.object({
	emailFrequency: z.enum(frequencyOptions),
	notesPerDigest: z.number().int().min(1).max(50),
	quizEnabled: z.boolean(),
	timezone: timezoneSchema,
	preferredSendHour: z.number().int().min(0).max(23),
});

const defaultSettings: z.infer<typeof settingsSchema> = {
	emailFrequency: "daily",
	notesPerDigest: 5,
	quizEnabled: false,
	timezone: "UTC",
	preferredSendHour: 8,
};

const capabilitiesSchema = z.object({
	deploymentMode: z.enum(["cloud", "self-hosted"]),
	billingMode: z.enum(["polar", "disabled"]),
	billingEnabled: z.boolean(),
	entitlements: z.object({
		planId: z.enum(["free", "pro"]),
		planName: z.string(),
		limits: z.object({
			maxNotes: z.number().nullable(),
			maxSources: z.number().nullable(),
		}),
		features: z.object({
			dailyDigest: z.boolean(),
			weeklyDigest: z.boolean(),
			monthlyDigest: z.boolean(),
			aiQuizzes: z.boolean(),
		}),
	}),
	usage: z.object({
		noteCount: z.number().int(),
		sourceCount: z.number().int(),
	}),
	isPro: z.boolean(),
});

function serializeLimit(value: number) {
	return value === Number.POSITIVE_INFINITY ? null : value;
}

const get = baseRoute
	.input(z.object({}).optional())
	.output(z.object({ settings: settingsSchema }))
	.handler(async ({ context }) => {
		const userId = context.user?.id;
		if (!userId) {
			throw new ORPCError("Unauthorized");
		}

		const row = await db.query.userSettings.findFirst({
			where: eq(userSettings.userId, userId),
			columns: {
				emailFrequency: true,
				notesPerDigest: true,
				quizEnabled: true,
				timezone: true,
				preferredSendHour: true,
			},
		});

		return {
			settings: row ?? defaultSettings,
		};
	});

const update = baseRoute
	.input(settingsSchema)
	.output(z.object({ settings: settingsSchema }))
	.handler(async ({ context, input }) => {
		const userId = context.user?.id;
		if (!userId) {
			throw new ORPCError("Unauthorized");
		}

		const now = new Date();

		await db
			.insert(userSettings)
			.values({
				userId,
				...input,
				updatedAt: now,
			})
			.onConflictDoUpdate({
				target: userSettings.userId,
				set: {
					...input,
					updatedAt: now,
				},
			});

		return { settings: input };
	});

const capabilities = baseRoute
	.input(z.object({}).optional())
	.output(z.object({ capabilities: capabilitiesSchema }))
	.handler(async ({ context }) => {
		const userId = context.user?.id;
		if (!userId) {
			throw new ORPCError("Unauthorized");
		}

		const billingMode = getBillingMode();
		const deploymentMode = getDeploymentMode();
		const billingEnabled = isBillingEnabled();
		const isPro = await getIsProForUser(userId);
		const [entitlements, noteCount, sourceCount] = await Promise.all([
			getUserEntitlements(userId),
			countUserDocuments(userId),
			countUserConnections(userId),
		]);

		return {
			capabilities: {
				deploymentMode,
				billingMode,
				billingEnabled,
				entitlements: {
					...entitlements,
					limits: {
						maxNotes: serializeLimit(entitlements.limits.maxNotes),
						maxSources: serializeLimit(entitlements.limits.maxSources),
					},
				},
				usage: {
					noteCount,
					sourceCount,
				},
				isPro,
			},
		};
	});

export const settingsRouter = {
	get,
	update,
	capabilities,
};

export type UserSettingsInput = z.infer<typeof settingsSchema>;
export const userSettingsFrequencyOptions = frequencyOptions;
