import { CryptoHasher } from "bun";
import { db, integrationConnections } from "@daily-brain-bits/db";
import { obsidianConnectionConfigSchema, serializeObsidianConnectionSecrets } from "@daily-brain-bits/integrations-obsidian";
import { and, eq } from "drizzle-orm";

function hashToken(token: string): string {
	const hasher = new CryptoHasher("sha256");
	hasher.update(token);
	return bytesToHex(hasher.digest());
}

function bytesToHex(bytes: Uint8Array): string {
	let hex = "";
	for (const byte of bytes) {
		hex += byte.toString(16).padStart(2, "0");
	}
	return hex;
}

const userId = process.env.USER_ID ?? "dev-user";
const displayName = process.env.DISPLAY_NAME ?? "Test Vault";
const vaultId = process.env.VAULT_ID ?? crypto.randomUUID();
const pluginToken = process.env.PLUGIN_TOKEN ?? crypto.randomUUID();

const existingConnection = await db.query.integrationConnections.findFirst({
	where: and(
		eq(integrationConnections.userId, userId),
		eq(integrationConnections.kind, "obsidian"),
		eq(integrationConnections.accountExternalId, vaultId),
	),
	columns: { id: true },
});

let connectionId: number;
const config = obsidianConnectionConfigSchema.parse({ vaultId });
const secretsJsonEncrypted = serializeObsidianConnectionSecrets({
	pluginTokenHash: hashToken(pluginToken),
});

if (existingConnection) {
	connectionId = existingConnection.id;
	await db
		.update(integrationConnections)
		.set({
			displayName,
			configJson: config,
			secretsJsonEncrypted,
			updatedAt: new Date(),
		})
		.where(eq(integrationConnections.id, connectionId));
} else {
	const [created] = await db
		.insert(integrationConnections)
		.values({
			userId,
			kind: "obsidian",
			status: "active",
			displayName,
			accountExternalId: vaultId,
			configJson: config,
			secretsJsonEncrypted,
		})
		.returning({ id: integrationConnections.id });

	if (!created) {
		throw new Error("Failed to create integration connection.");
	}

	connectionId = created.id;
}

console.log("Obsidian test setup complete.");
console.log(`- User ID:        ${userId}`);
console.log(`- Vault ID:       ${vaultId}`);
console.log(`- Plugin token:   ${pluginToken}`);
console.log(`- Connection ID:  ${connectionId}`);
console.log("");
console.log("Manual steps:");
console.log("1) In Obsidian plugin settings, set:");
console.log(`   - Vault ID: ${vaultId}`);
console.log(`   - Plugin token: ${pluginToken}`);
console.log("2) Run command palette: DBB: Sync now");
