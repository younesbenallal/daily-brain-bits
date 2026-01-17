import { createHash } from "crypto";

export function hashApiKey(key: string): string {
	const hash = createHash("sha256").update(key).digest();
	return hash.toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
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