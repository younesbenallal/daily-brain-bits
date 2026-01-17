import { z } from "zod";

export const preferenceFrequencyOptions = ["Daily", "Weekly", "Monthly"] as const;

const preferencesSchema = z.object({
	timezone: z.string().trim().min(1),
	frequency: z.enum(preferenceFrequencyOptions),
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
export type PreferenceFrequency = (typeof preferenceFrequencyOptions)[number];

export function isOnboardingStepComplete<T extends OnboardingStepKey>(
	step: T,
	input: z.input<(typeof onboardingStepSchemas)[T]>,
): boolean {
	return onboardingStepSchemas[step].safeParse(input).success;
}
