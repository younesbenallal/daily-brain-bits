import { db, userSettings } from "@daily-brain-bits/db";
import { ORPCError } from "@orpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { baseRoute } from "../context";

const frequencyOptions = ["daily", "weekly", "monthly"] as const;

const settingsSchema = z.object({
	emailFrequency: z.enum(frequencyOptions),
	notesPerDigest: z.number().int().min(1).max(50),
	quizEnabled: z.boolean(),
});

const defaultSettings: z.infer<typeof settingsSchema> = {
	emailFrequency: "daily",
	notesPerDigest: 5,
	quizEnabled: false,
};

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

export const settingsRouter = {
	get,
	update,
};

export type UserSettingsInput = z.infer<typeof settingsSchema>;
export const userSettingsFrequencyOptions = frequencyOptions;
