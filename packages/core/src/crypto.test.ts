import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { clearKeyCache, decryptContent, encryptContent, isEncryptionConfigured } from "./crypto";

// Test keys: 32 bytes, base64 encoded (generated with: openssl rand -base64 32)
const TEST_KEY = "y4PmIdvpqEzE3S6zPA2eZIsWeojjdUjVYQwwZEVJe3A=";
const TEST_KEY_V2 = "yneKtDoGpYZncT1V0vvy4mJoGN6jMDkZ9Lo6QysqPNA=";

describe("crypto", () => {
	beforeEach(() => {
		clearKeyCache();
		process.env.CONTENT_ENCRYPTION_KEY = TEST_KEY;
		delete process.env.CONTENT_ENCRYPTION_KEY_V2;
	});

	afterEach(() => {
		clearKeyCache();
		delete process.env.CONTENT_ENCRYPTION_KEY;
		delete process.env.CONTENT_ENCRYPTION_KEY_V2;
	});

	describe("encryptContent", () => {
		it("encrypts content with AES-256-GCM", () => {
			const plaintext = "Hello, World!";
			const encrypted = encryptContent(plaintext);

			expect(encrypted.alg).toBe("aes-256-gcm");
			expect(encrypted.keyVersion).toBe(1);
			expect(encrypted.iv).toBeTruthy();
			expect(encrypted.ciphertext).toBeTruthy();
			expect(encrypted.ciphertext).not.toBe(plaintext);
		});

		it("produces different ciphertext for same plaintext (unique IV)", () => {
			const plaintext = "Same content";
			const encrypted1 = encryptContent(plaintext);
			const encrypted2 = encryptContent(plaintext);

			expect(encrypted1.ciphertext).not.toBe(encrypted2.ciphertext);
			expect(encrypted1.iv).not.toBe(encrypted2.iv);
		});

		it("throws when no encryption key is configured", () => {
			delete process.env.CONTENT_ENCRYPTION_KEY;
			clearKeyCache();

			expect(() => encryptContent("test")).toThrow("CONTENT_ENCRYPTION_KEY not configured");
		});

		it("throws when key is wrong length", () => {
			process.env.CONTENT_ENCRYPTION_KEY = "dG9vLXNob3J0"; // "too-short" base64
			clearKeyCache();

			expect(() => encryptContent("test")).toThrow("must be 32 bytes");
		});
	});

	describe("decryptContent", () => {
		it("decrypts encrypted content back to original", () => {
			const plaintext = "Hello, World! This is a test message with unicode: 你好世界 🎉";
			const encrypted = encryptContent(plaintext);
			const decrypted = decryptContent(encrypted);

			expect(decrypted).toBe(plaintext);
		});

		it("decrypts legacy base64 content (alg: none)", () => {
			const plaintext = "Legacy content";
			const legacy = {
				ciphertext: Buffer.from(plaintext, "utf8").toString("base64"),
				iv: "none",
				alg: "none",
				keyVersion: 0,
			};

			const decrypted = decryptContent(legacy);
			expect(decrypted).toBe(plaintext);
		});

		it("throws on tampered ciphertext", () => {
			const encrypted = encryptContent("test");
			const tampered = {
				...encrypted,
				ciphertext: `${encrypted.ciphertext.slice(0, -4)}AAAA`,
			};

			expect(() => decryptContent(tampered)).toThrow();
		});

		it("throws on unsupported algorithm", () => {
			const invalid = {
				ciphertext: "test",
				iv: "test",
				alg: "unknown-alg",
				keyVersion: 1,
			};

			expect(() => decryptContent(invalid)).toThrow("Unsupported encryption algorithm");
		});
	});

	describe("key rotation", () => {
		it("uses highest version key for encryption", () => {
			process.env.CONTENT_ENCRYPTION_KEY_V2 = TEST_KEY_V2;
			clearKeyCache();

			const encrypted = encryptContent("test");
			expect(encrypted.keyVersion).toBe(2);
		});

		it("decrypts content with older key version", () => {
			// Encrypt with v1
			const plaintext = "encrypted with v1";
			const encryptedV1 = encryptContent(plaintext);
			expect(encryptedV1.keyVersion).toBe(1);

			// Add v2 key
			process.env.CONTENT_ENCRYPTION_KEY_V2 = TEST_KEY_V2;
			clearKeyCache();

			// Should still decrypt v1 content
			const decrypted = decryptContent(encryptedV1);
			expect(decrypted).toBe(plaintext);
		});

		it("throws when decrypting with missing key version", () => {
			const encrypted = {
				ciphertext: "test",
				iv: "test",
				alg: "aes-256-gcm",
				keyVersion: 99,
			};

			expect(() => decryptContent(encrypted)).toThrow("key version 99 not found");
		});
	});

	describe("isEncryptionConfigured", () => {
		it("returns true when key is configured", () => {
			expect(isEncryptionConfigured()).toBe(true);
		});

		it("returns false when no key is configured", () => {
			delete process.env.CONTENT_ENCRYPTION_KEY;
			clearKeyCache();

			expect(isEncryptionConfigured()).toBe(false);
		});
	});

	describe("edge cases", () => {
		it("handles empty string", () => {
			const encrypted = encryptContent("");
			const decrypted = decryptContent(encrypted);
			expect(decrypted).toBe("");
		});

		it("handles large content", () => {
			const plaintext = "x".repeat(100000);
			const encrypted = encryptContent(plaintext);
			const decrypted = decryptContent(encrypted);
			expect(decrypted).toBe(plaintext);
		});

		it("handles special characters and unicode", () => {
			const plaintext = "Special chars: <>&\"' \n\t\r Unicode: 日本語 Emoji: 🔐🎉";
			const encrypted = encryptContent(plaintext);
			const decrypted = decryptContent(encrypted);
			expect(decrypted).toBe(plaintext);
		});
	});
});
