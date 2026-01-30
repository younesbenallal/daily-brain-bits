import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32;

export type EncryptedContent = {
	ciphertext: string;
	iv: string;
	alg: string;
	keyVersion: number;
};

type EncryptionKey = {
	key: Buffer;
	version: number;
};

let cachedKeys: Map<number, Buffer> | null = null;
let currentKeyVersion: number | null = null;

function getEncryptionKeys(): Map<number, Buffer> {
	if (cachedKeys) {
		return cachedKeys;
	}

	const keys = new Map<number, Buffer>();

	// Primary key (version 1)
	const primaryKey = process.env.CONTENT_ENCRYPTION_KEY;
	if (primaryKey) {
		const keyBuffer = Buffer.from(primaryKey, "base64");
		if (keyBuffer.length !== KEY_LENGTH) {
			throw new Error(`CONTENT_ENCRYPTION_KEY must be ${KEY_LENGTH} bytes (got ${keyBuffer.length}). Generate with: openssl rand -base64 32`);
		}
		keys.set(1, keyBuffer);
	}

	// Support key rotation: CONTENT_ENCRYPTION_KEY_V2, V3, etc.
	for (let version = 2; version <= 10; version++) {
		const envKey = process.env[`CONTENT_ENCRYPTION_KEY_V${version}`];
		if (envKey) {
			const keyBuffer = Buffer.from(envKey, "base64");
			if (keyBuffer.length !== KEY_LENGTH) {
				throw new Error(`CONTENT_ENCRYPTION_KEY_V${version} must be ${KEY_LENGTH} bytes`);
			}
			keys.set(version, keyBuffer);
		}
	}

	cachedKeys = keys;
	return keys;
}

function getCurrentKey(): EncryptionKey {
	const keys = getEncryptionKeys();

	if (keys.size === 0) {
		throw new Error("CONTENT_ENCRYPTION_KEY not configured. Generate with: openssl rand -base64 32");
	}

	// Use the highest version key for encryption
	if (currentKeyVersion === null) {
		currentKeyVersion = Math.max(...keys.keys());
	}

	const key = keys.get(currentKeyVersion);
	if (!key) {
		throw new Error(`Encryption key version ${currentKeyVersion} not found`);
	}

	return { key, version: currentKeyVersion };
}

function getKeyForVersion(version: number): Buffer {
	const keys = getEncryptionKeys();
	const key = keys.get(version);

	if (!key) {
		throw new Error(`Encryption key version ${version} not found. Cannot decrypt content.`);
	}

	return key;
}

export function encryptContent(plaintext: string): EncryptedContent {
	const { key, version } = getCurrentKey();
	const iv = randomBytes(IV_LENGTH);

	const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });

	const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);

	const authTag = cipher.getAuthTag();

	// Combine ciphertext + authTag for storage
	const combined = Buffer.concat([encrypted, authTag]);

	return {
		ciphertext: combined.toString("base64"),
		iv: iv.toString("base64"),
		alg: ALGORITHM,
		keyVersion: version,
	};
}

export function decryptContent(encrypted: EncryptedContent): string {
	// Handle legacy unencrypted content
	if (encrypted.alg === "none") {
		return Buffer.from(encrypted.ciphertext, "base64").toString("utf8");
	}

	if (encrypted.alg !== ALGORITHM) {
		throw new Error(`Unsupported encryption algorithm: ${encrypted.alg}`);
	}

	const key = getKeyForVersion(encrypted.keyVersion);
	const iv = Buffer.from(encrypted.iv, "base64");
	const combined = Buffer.from(encrypted.ciphertext, "base64");

	// Extract ciphertext and auth tag
	const authTag = combined.subarray(combined.length - AUTH_TAG_LENGTH);
	const ciphertext = combined.subarray(0, combined.length - AUTH_TAG_LENGTH);

	const decipher = createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
	decipher.setAuthTag(authTag);

	const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);

	return decrypted.toString("utf8");
}

export function isEncryptionConfigured(): boolean {
	try {
		getEncryptionKeys();
		return cachedKeys !== null && cachedKeys.size > 0;
	} catch {
		return false;
	}
}

// For testing: clear cached keys
export function clearKeyCache(): void {
	cachedKeys = null;
	currentKeyVersion = null;
}
