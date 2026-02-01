import { createHash } from "node:crypto";

import { apikey, db } from "@daily-brain-bits/db";
import { and, eq, gt, isNull, or } from "drizzle-orm";

export function hashApiKey(key: string): string {
	const hash = createHash("sha256").update(key).digest();
	return hash.toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

/**
 * Manually verify an API key by querying the database.
 * Workaround for Better Auth's broken verifyApiKey (https://github.com/better-auth/better-auth/issues/6258)
 */
export async function verifyApiKeyManually(key: string): Promise<{
	valid: boolean;
	key?: { id: string; userId: string; expiresAt: Date | null };
}> {
	const hash = hashApiKey(key);

	const result = await db.query.apikey.findFirst({
		where: and(eq(apikey.key, hash), eq(apikey.enabled, true), or(isNull(apikey.expiresAt), gt(apikey.expiresAt, new Date()))),
		columns: {
			id: true,
			userId: true,
			expiresAt: true,
		},
	});

	if (!result) {
		return { valid: false };
	}

	return {
		valid: true,
		key: {
			id: result.id,
			userId: result.userId,
			expiresAt: result.expiresAt,
		},
	};
}

export function createApiKeySession(keyData: { id: string; userId: string; expiresAt: Date | null }, apiKeyHeader: string) {
	const now = new Date();
	return {
		user: {
			id: keyData.userId,
			name: "API Key User",
			email: `api-key-${keyData.id}@daily-brain-bits.local`,
			emailVerified: true,
			createdAt: now,
			updatedAt: now,
		},
		session: {
			id: keyData.id,
			token: apiKeyHeader,
			userId: keyData.userId,
			expiresAt: keyData.expiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days default
			createdAt: now,
			updatedAt: now,
			ipAddress: null,
			userAgent: "API Key",
		},
	};
}
