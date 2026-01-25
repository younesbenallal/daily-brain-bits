import { z } from "zod";

const preferencesSchema = z.object({
	timezone: z.string().trim().min(1),
	preferredSendHour: z.number().int().min(0).max(23),
});

const configureObsidianSchema = z.object({
	connected: z.literal(true),
	vaultId: z.string().min(1),
	lastSeenAt: z.string().datetime(),
});

const configureNotionSchema = z.object({
	connected: z.literal(true),
});

const loadingSchema = z.object({
	noteDigestReady: z.literal(true),
});

export const onboardingStepSchemas = {
	preferences: preferencesSchema,
	configureObsidian: configureObsidianSchema,
	configureNotion: configureNotionSchema,
	loading: loadingSchema,
};

export type OnboardingStepKey = keyof typeof onboardingStepSchemas;

export function isOnboardingStepComplete<T extends OnboardingStepKey>(
	step: T,
	input: z.input<(typeof onboardingStepSchemas)[T]>,
): boolean {
	return onboardingStepSchemas[step].safeParse(input).success;
}
