import { db, userSettings } from "@daily-brain-bits/db";
import { ORPCError } from "@orpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { baseRoute } from "../context";
import { isValidTimezone } from "../utils/digest-schedule";
import { getBillingMode, getDeploymentMode, getIsProForUser, isBillingEnabled } from "../utils/entitlements";

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
	isPro: z.boolean(),
});

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

		return {
			capabilities: {
				deploymentMode,
				billingMode,
				billingEnabled,
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
