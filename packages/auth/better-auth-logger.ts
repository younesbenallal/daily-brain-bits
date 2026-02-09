import type { Logger } from "better-auth";

const tokenLike = /\b[A-Za-z0-9_-]{20,}\b/g;

function redactSecretsInText(input: string) {
	// Common Better Auth DB log pattern includes a token as `params: <token>`.
	let text = input.replace(/(\bparams:\s*)(.*)$/i, "$1[redacted]");

	// If something slips through as a bearer token, redact it.
	text = text.replace(/\bBearer\s+([^\s]+)/gi, "Bearer [redacted]");

	// Avoid leaking Postgres passwords if a URL is logged.
	text = text.replace(/(postgres(?:ql)?:\/\/[^:\s]+:)([^@\s]+)(@)/gi, "$1[redacted]$3");

	// Avoid logging raw tokens/keys if they appear in free-form text.
	text = text.replace(tokenLike, "[redacted]");

	return text;
}

function redactArg(arg: unknown) {
	if (typeof arg === "string") {
		return redactSecretsInText(arg);
	}
	if (arg instanceof Error) {
		return {
			name: arg.name,
			message: redactSecretsInText(arg.message),
			// Keep stack for debugging; it should not contain secrets, but redact if it does.
			stack: arg.stack ? redactSecretsInText(arg.stack) : undefined,
		};
	}
	return arg;
}

export function createBetterAuthLogger(): Logger {
	const level = (process.env.BETTER_AUTH_LOG_LEVEL as Logger["level"]) ?? "error";

	return {
		level,
		disableColors: true,
		log(level, message, ...args) {
			const msg = redactSecretsInText(message);
			const safeArgs = args.map(redactArg);

			if (level === "error") {
				console.error(`[Better Auth] ${msg}`, ...safeArgs);
				return;
			}
			if (level === "warn") {
				console.warn(`[Better Auth] ${msg}`, ...safeArgs);
				return;
			}
			console.log(`[Better Auth] ${msg}`, ...safeArgs);
		},
	};
}

