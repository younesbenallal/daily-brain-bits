import { CryptoHasher } from "bun";
import { db, integrationConnections, obsidianVaults } from "@daily-brain-bits/db";
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

const existingConnection = await db
	.select({ id: integrationConnections.id })
	.from(integrationConnections)
	.where(
		and(
			eq(integrationConnections.userId, userId),
			eq(integrationConnections.kind, "obsidian"),
			eq(integrationConnections.accountExternalId, vaultId),
		),
	)
	.limit(1);

let connectionId: number;

if (existingConnection.length > 0) {
	connectionId = existingConnection[0].id;
} else {
	const [created] = await db
		.insert(integrationConnections)
		.values({
			userId,
			kind: "obsidian",
			status: "active",
			displayName,
			accountExternalId: vaultId,
			configJson: { vaultId },
			secretsJsonEncrypted: null,
		})
		.returning({ id: integrationConnections.id });

	if (!created) {
		throw new Error("Failed to create integration connection.");
	}

	connectionId = created.id;
}

await db
	.insert(obsidianVaults)
	.values({
		vaultId,
		userId,
		connectionId,
		pluginTokenHash: hashToken(pluginToken),
		deviceIdsJson: [],
		settingsJson: {},
	})
	.onConflictDoUpdate({
		target: obsidianVaults.vaultId,
		set: {
			userId,
			connectionId,
			pluginTokenHash: hashToken(pluginToken),
			updatedAt: new Date(),
		},
	});

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
