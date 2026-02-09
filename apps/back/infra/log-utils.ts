const tokenLike = /\b[A-Za-z0-9_-]{20,}\b/g;

export function redactSecretsInText(input: string) {
	// Common Better Auth DB log pattern includes a token as `params: <token>`.
	let text = input.replace(/(\bparams:\s*)(.*)$/i, "$1[redacted]");

	// If something slips through as a bearer token, redact it.
	text = text.replace(/\bBearer\s+([^\s]+)/gi, "Bearer [redacted]");

	// Avoid logging raw tokens/keys if they appear in free-form text.
	text = text.replace(tokenLike, "[redacted]");

	// Avoid leaking Postgres passwords if a URL is logged.
	text = text.replace(/(postgres(?:ql)?:\/\/[^:\s]+:)([^@\s]+)(@)/gi, "$1[redacted]$3");

	return text;
}

export function getDatabaseUrlSummary(databaseUrl: string | undefined) {
	if (!databaseUrl) {
		return null;
	}

	try {
		const url = new URL(databaseUrl);
		const host = url.hostname || null;
		const port = url.port ? Number(url.port) : null;
		const database = url.pathname ? url.pathname.replace(/^\//, "") : null;
		const isHyperdrive = host ? host.includes("hyperdrive") || host.includes("cloudflare") : false;

		return {
			protocol: url.protocol.replace(":", ""),
			host,
			port,
			database,
			isHyperdrive,
			search: url.search ? "[redacted]" : null,
		};
	} catch {
		// If parsing fails, only return a redacted string.
		return {
			protocol: null,
			host: null,
			port: null,
			database: null,
			isHyperdrive: null,
			search: null,
		};
	}
}

export function getErrorSummary(error: unknown) {
	if (!(error instanceof Error)) {
		return {
			kind: typeof error,
			value: redactSecretsInText(String(error)),
		};
	}

	// postgres.js / PostgresError carries useful fields (code, detail, schema, table, column, constraint, etc.)
	const anyErr = error as unknown as Record<string, unknown>;
	const pick = (key: string) => (typeof anyErr[key] === "string" ? anyErr[key] : undefined);

	return {
		name: error.name,
		message: redactSecretsInText(error.message),
		code: pick("code"),
		severity: pick("severity"),
		detail: pick("detail"),
		hint: pick("hint"),
		where: pick("where"),
		schema: pick("schema"),
		table: pick("table"),
		column: pick("column"),
		constraint: pick("constraint"),
	};
}
