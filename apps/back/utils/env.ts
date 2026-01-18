import { z } from "zod";

const optionalString = z.preprocess((value) => {
	if (typeof value === "string") {
		const trimmed = value.trim();
		return trimmed === "" ? undefined : trimmed;
	}
	return value;
}, z.string().min(1).optional());

const booleanFromString = z.preprocess((value) => {
	if (typeof value === "string") {
		return value.toLowerCase() === "true";
	}
	if (typeof value === "boolean") {
		return value;
	}
	return value;
}, z.boolean());

const schema = z.object({
	NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
	DATABASE_URL: z.string().min(1),
	BETTER_AUTH_SECRET: z.string().min(1),
	BETTER_AUTH_URL: optionalString,
	FRONTEND_URL: z.string().min(1).default("http://localhost:3000"),
	BACKEND_URL: optionalString,
	PORT: z.preprocess((value) => {
		if (typeof value === "string" && value.trim() !== "") {
			return Number(value);
		}
		if (typeof value === "number") {
			return value;
		}
		return undefined;
	}, z.number().int().positive().optional()),
	RESEND_API_KEY: z.string().min(1),
	RESEND_FROM: z.string().min(1).default("digest@dbb.notionist.app"),
	RESEND_REPLY_TO: optionalString,
	DIGEST_EMAIL_DRY_RUN: booleanFromString.optional().default(false),
	POSTHOG_API_KEY: optionalString,
	POSTHOG_HOST: optionalString,
	POLAR_ACCESS_TOKEN: optionalString,
	POLAR_SERVER: optionalString,
	POLAR_PRO_PRODUCT_ID: optionalString,
	POLAR_WEBHOOK_SECRET: optionalString,
	GOOGLE_CLIENT_ID: optionalString,
	GOOGLE_CLIENT_SECRET: optionalString,
	APPLE_CLIENT_ID: optionalString,
	APPLE_CLIENT_SECRET: optionalString,
	NOTION_CLIENT_ID: optionalString,
	NOTION_CLIENT_SECRET: optionalString,
	NOTION_API_KEY: optionalString,
	NOTION_TOKEN: optionalString,
	NOTION_DATABASE_ID: optionalString,
});

const result = schema.safeParse(process.env);
if (!result.success) {
	console.error("Invalid environment variables:", result.error.issues);
	throw new Error("Invalid environment configuration");
}

export const env = result.data;
export type Env = typeof env;
