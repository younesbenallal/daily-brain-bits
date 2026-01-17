import { createHash } from "node:crypto";
import { apikey, db, integrationConnections } from "@daily-brain-bits/db";
import {
	obsidianConnectionConfigSchema,
	obsidianRegisterResponseSchema,
	parseObsidianConnectionConfig,
	serializeObsidianConnectionSecrets,
	syncBatchRequestSchema,
	syncBatchResponseSchema,
} from "@daily-brain-bits/integrations-obsidian";
import { ORPCError } from "@orpc/server";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { apiKeyRoute, baseRoute } from "../context";
import { runSyncPipeline } from "../integrations/sync-pipeline";

const registerRequestSchema = z.object({
	displayName: z.string().min(1).optional(),
});

function hashToken(token: string): string {
	return createHash("sha256").update(token).digest("hex");
}

function buildObsidianConfig(options: { vaultId: string; deviceIds?: string[]; settings?: Record<string, unknown> }) {
	return obsidianConnectionConfigSchema.parse({
		vaultId: options.vaultId,
		deviceIds: options.deviceIds ?? [],
		settings: options.settings ?? {},
	});
}

const register = baseRoute
	.input(registerRequestSchema)
	.output(obsidianRegisterResponseSchema)
	.handler(async ({ context, input }) => {
		const userId = context.user?.id;
		if (!userId) {
			throw new ORPCError("Unauthorized");
		}

		console.log("[obsidian.register] start", {
			userId,
			displayName: input.displayName ?? null,
		});
		const vaultId = crypto.randomUUID();
		const pluginToken = crypto.randomUUID();
		const apiBaseUrl = process.env.API_BASE_URL || "http://localhost:3001";

		const config = buildObsidianConfig({ vaultId });
		const secretsJsonEncrypted = serializeObsidianConnectionSecrets({
			pluginTokenHash: hashToken(pluginToken),
		});

		const [connection] = await db
			.insert(integrationConnections)
			.values({
				userId,
				kind: "obsidian",
				status: "active",
				displayName: input.displayName,
				accountExternalId: vaultId,
				configJson: config,
				secretsJsonEncrypted,
			})
			.returning({
				id: integrationConnections.id,
			});

		const connectionId = connection?.id;
		if (!connectionId) {
			throw new ORPCError("INTERNAL_SERVER_ERROR", {
				message: "failed_to_create_connection",
			});
		}

		console.log("[obsidian.register] created", {
			userId,
			vaultId,
			connectionId,
		});

		return {
			pluginToken,
			vaultId,
			apiBaseUrl,
			connectionId,
		};
	});

async function ensureConnectionForVault(options: { userId: string; vaultId: string; displayName?: string }) {
	const { userId, vaultId, displayName } = options;

	const connection = await db.query.integrationConnections.findFirst({
		where: and(eq(integrationConnections.kind, "obsidian"), eq(integrationConnections.accountExternalId, vaultId)),
		columns: {
			id: true,
			displayName: true,
			userId: true,
			configJson: true,
		},
	});

	if (connection) {
		if (connection.userId !== userId) {
			throw new ORPCError("FORBIDDEN", {
				message: "vault_in_use",
			});
		}

		const existingConfig = parseObsidianConnectionConfig(connection.configJson);
		let nextConfig = existingConfig;
		let shouldUpdateConfig = false;

		if (existingConfig.vaultId !== vaultId) {
			nextConfig = obsidianConnectionConfigSchema.parse({
				...existingConfig,
				vaultId,
			});
			shouldUpdateConfig = true;
		}

		const updates: { displayName?: string; configJson?: typeof nextConfig; updatedAt?: Date } = {};
		if (displayName && displayName !== connection.displayName) {
			updates.displayName = displayName;
		}
		if (shouldUpdateConfig) {
			updates.configJson = nextConfig;
		}
		if (Object.keys(updates).length > 0) {
			updates.updatedAt = new Date();
			await db.update(integrationConnections).set(updates).where(eq(integrationConnections.id, connection.id));
		}

		return {
			connectionId: connection.id,
			displayName: displayName ?? connection.displayName ?? "Obsidian Vault",
			config: nextConfig,
		};
	}

	const now = new Date();
	const config = buildObsidianConfig({ vaultId });
	const [created] = await db
		.insert(integrationConnections)
		.values({
			userId,
			kind: "obsidian",
			status: "active",
			displayName: displayName ?? "Obsidian Vault",
			accountExternalId: vaultId,
			configJson: config,
			secretsJsonEncrypted: null,
			updatedAt: now,
			lastSeenAt: now,
		})
		.returning({
			id: integrationConnections.id,
			displayName: integrationConnections.displayName,
		});

	const connectionId = created?.id;
	if (!connectionId) {
		throw new ORPCError("INTERNAL_SERVER_ERROR", {
			message: "failed_to_create_connection",
		});
	}

	return { connectionId, displayName: created.displayName ?? "Obsidian Vault", config };
}

const syncBatch = apiKeyRoute
	.input(syncBatchRequestSchema)
	.output(syncBatchResponseSchema)
	.handler(async ({ context, input }) => {
		const userId = context.user?.id;
		if (!userId) {
			throw new ORPCError("Unauthorized");
		}

		const { connectionId, config } = await ensureConnectionForVault({
			userId,
			vaultId: input.vaultId,
			displayName: input.vaultName,
		});

		if (!connectionId) {
			throw new ORPCError("INTERNAL_SERVER_ERROR", {
				message: "failed_to_get_connection",
			});
		}

		const now = new Date();
		const ingestResult = await runSyncPipeline({
			connectionId,
			userId,
			items: input.items,
			receivedAt: now,
			sourceKind: "obsidian",
			defaultDeletedAtSource: input.sentAt,
		});

		let nextConfig = config;
		let shouldUpdateConfig = false;

		if (input.deviceId) {
			const existingDeviceIds = Array.isArray(config.deviceIds) ? config.deviceIds : [];
			if (!existingDeviceIds.includes(input.deviceId)) {
				nextConfig = obsidianConnectionConfigSchema.parse({
					...config,
					vaultId: config.vaultId ?? input.vaultId,
					deviceIds: [...existingDeviceIds, input.deviceId],
				});
				shouldUpdateConfig = true;
			}
		}

		const updates: { lastSeenAt: Date; updatedAt?: Date; configJson?: typeof nextConfig } = {
			lastSeenAt: now,
		};
		if (shouldUpdateConfig) {
			updates.configJson = nextConfig;
			updates.updatedAt = now;
		}

		await db.update(integrationConnections).set(updates).where(eq(integrationConnections.id, connectionId));

		return {
			accepted: ingestResult.accepted,
			rejected: ingestResult.rejected,
			itemResults: ingestResult.itemResults,
		};
	});

const status = apiKeyRoute
	.input(z.object({}).optional())
	.output(
		z.object({
			connected: z.boolean(),
			vaultId: z.string().nullable(),
			vaultName: z.string().nullable(),
			lastSeenAt: z.string().datetime().nullable(),
		}),
	)
	.handler(async ({ context }) => {
		const userId = context.user?.id;
		if (!userId) {
			throw new ORPCError("Unauthorized");
		}

		const connection = await db.query.integrationConnections.findFirst({
			where: and(eq(integrationConnections.userId, userId), eq(integrationConnections.kind, "obsidian")),
			columns: {
				id: true,
				displayName: true,
				accountExternalId: true,
				lastSeenAt: true,
			},
			orderBy: [desc(integrationConnections.updatedAt)],
		});

		// Also check for API keys that indicate Obsidian connection attempts
		const apiKey = await db.query.apikey.findFirst({
			where: and(eq(apikey.userId, userId), eq(apikey.name, "Obsidian Plugin")),
			columns: {
				id: true,
				name: true,
			},
		});

		const hasApiKey = Boolean(apiKey);

		if (!connection && !hasApiKey) {
			return {
				connected: false,
				vaultId: null,
				vaultName: null,
				lastSeenAt: null,
			};
		}

		// If we have an API key but no connection, show as connected with limited info
		if (!connection && hasApiKey) {
			return {
				connected: false,
				vaultId: null,
				vaultName: null,
				lastSeenAt: null,
			};
		}

		// At this point, connection is guaranteed to exist since we returned early if it didn't
		if (!connection) {
			throw new ORPCError("INTERNAL_SERVER_ERROR", {
				message: "connection_not_found",
			});
		}

		return {
			connected: true,
			vaultId: connection.accountExternalId ?? null,
			vaultName: connection.displayName ?? "Obsidian Vault",
			lastSeenAt: connection.lastSeenAt?.toISOString() ?? null,
		};
	});

export const obsidianRouter = {
	register,
	status,
	sync: {
		batch: syncBatch,
	},
};
