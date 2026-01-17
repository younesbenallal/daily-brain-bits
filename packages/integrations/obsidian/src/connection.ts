import { z } from "zod";

const nonEmptyString = z.string().min(1);

export const obsidianConnectionConfigSchema = z
	.object({
		vaultId: nonEmptyString.optional(),
		deviceIds: z.array(nonEmptyString).default([]),
		settings: z.record(z.unknown()).default({}),
	})
	.passthrough();

export const obsidianConnectionSecretsSchema = z
	.object({
		pluginTokenHash: nonEmptyString,
	})
	.passthrough();

export type ObsidianConnectionConfig = z.infer<typeof obsidianConnectionConfigSchema>;
export type ObsidianConnectionSecrets = z.infer<typeof obsidianConnectionSecretsSchema>;

const defaultConfig = obsidianConnectionConfigSchema.parse({});

export function parseObsidianConnectionConfig(value: unknown): ObsidianConnectionConfig {
	const parsed = obsidianConnectionConfigSchema.safeParse(value);
	return parsed.success ? parsed.data : defaultConfig;
}

export function parseObsidianConnectionSecrets(value: string | null | undefined): ObsidianConnectionSecrets | null {
	if (!value) {
		return null;
	}
	try {
		const parsed = obsidianConnectionSecretsSchema.safeParse(JSON.parse(value));
		return parsed.success ? parsed.data : null;
	} catch {
		return null;
	}
}

export function serializeObsidianConnectionSecrets(value: ObsidianConnectionSecrets | null): string | null {
	if (!value) {
		return null;
	}
	return JSON.stringify(value);
}
