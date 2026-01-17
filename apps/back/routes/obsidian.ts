import { createHash } from "node:crypto";
import { apikey, db, integrationConnections, integrationScopeItems, obsidianVaults } from "@daily-brain-bits/db";
import {
	obsidianRegisterResponseSchema,
	obsidianScopeResponseSchema,
	syncBatchRequestSchema,
	syncBatchResponseSchema,
} from "@daily-brain-bits/integrations-obsidian";
import { ORPCError } from "@orpc/server";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { baseRoute } from "../context";
import { runSyncPipeline } from "../integrations/sync-pipeline";

const registerRequestSchema = z.object({
	displayName: z.string().min(1).optional(),
});

function hashToken(token: string): string {
	return createHash("sha256").update(token).digest("hex");
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

		const [connection] = await db
			.insert(integrationConnections)
			.values({
				userId,
				kind: "obsidian",
				status: "active",
				displayName: input.displayName ?? "Obsidian Vault",
				accountExternalId: vaultId,
				configJson: {
					vaultId,
				},
				secretsJsonEncrypted: null,
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

		await db.insert(obsidianVaults).values({
			vaultId,
			userId,
			connectionId,
			pluginTokenHash: hashToken(pluginToken),
			deviceIdsJson: [],
			settingsJson: {},
		});

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
	const vaultRows = await db
		.select({
			vaultId: obsidianVaults.vaultId,
			userId: obsidianVaults.userId,
			connectionId: obsidianVaults.connectionId,
		})
		.from(obsidianVaults)
		.where(eq(obsidianVaults.vaultId, vaultId))
		.limit(1);

	if (vaultRows.length > 0 && vaultRows[0]?.userId !== userId) {
		throw new ORPCError("FORBIDDEN", {
			message: "vault_in_use",
		});
	}

	const connection = await db
		.select({
			id: integrationConnections.id,
			displayName: integrationConnections.displayName,
			userId: integrationConnections.userId,
		})
		.from(integrationConnections)
		.where(and(eq(integrationConnections.kind, "obsidian"), eq(integrationConnections.accountExternalId, vaultId)))
		.limit(1);

	if (connection.length > 0) {
		const existing = connection[0];
		if (!existing) {
			throw new ORPCError("INTERNAL_SERVER_ERROR", {
				message: "failed_to_get_connection",
			});
		}
		if (existing.userId && existing.userId !== userId) {
			throw new ORPCError("FORBIDDEN", {
				message: "vault_in_use",
			});
		}

		if (!vaultRows.length) {
			await db.insert(obsidianVaults).values({
				vaultId,
				userId,
				connectionId: existing.id,
				deviceIdsJson: [],
				settingsJson: {},
			});
		}

		if (displayName && displayName !== existing.displayName) {
			await db
				.update(integrationConnections)
				.set({ displayName })
				.where(eq(integrationConnections.id, existing.id));
		}

		return {
			connectionId: existing.id,
			displayName: displayName ?? existing.displayName ?? "Obsidian Vault",
		};
	}

	const now = new Date();
	const [created] = await db
		.insert(integrationConnections)
		.values({
			userId,
			kind: "obsidian",
			status: "active",
			displayName: displayName ?? "Obsidian Vault",
			accountExternalId: vaultId,
			configJson: {
				vaultId,
			},
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

	await db.insert(obsidianVaults).values({
		vaultId,
		userId,
		connectionId,
		deviceIdsJson: [],
		settingsJson: {},
	});

	return { connectionId, displayName: created.displayName ?? "Obsidian Vault" };
}

const scope = baseRoute
	.input(
		z.object({
			vaultId: z.string().min(1),
			vaultName: z.string().min(1).optional(),
		}),
	)
	.output(obsidianScopeResponseSchema)
	.handler(async ({ context, input }) => {
		const userId = context.user?.id;
		if (!userId) {
			throw new ORPCError("Unauthorized");
		}

		console.log("[obsidian.scope] start", { vaultId: input.vaultId });
		const { connectionId } = await ensureConnectionForVault({
			userId,
			vaultId: input.vaultId,
			displayName: input.vaultName,
		});

		if (!connectionId) {
			throw new ORPCError("INTERNAL_SERVER_ERROR", {
				message: "failed_to_get_connection",
			});
		}

		const scopeItems = await db
			.select({
				value: integrationScopeItems.scopeValue,
				updatedAt: integrationScopeItems.updatedAt,
			})
			.from(integrationScopeItems)
			.where(
				and(
					eq(integrationScopeItems.connectionId, connectionId),
					eq(integrationScopeItems.scopeType, "obsidian_glob"),
					eq(integrationScopeItems.enabled, true),
				),
			);

		const updatedAt = scopeItems.reduce<string | undefined>((max, item) => {
			const value = item.updatedAt?.toISOString();
			if (!value) {
				return max;
			}
			if (!max || value > max) {
				return value;
			}
			return max;
		}, undefined);

		console.log("[obsidian.scope] resolved", {
			vaultId: input.vaultId,
			connectionId,
			patternCount: scopeItems.length,
		});

		const now = new Date();
		await db
			.update(integrationConnections)
			.set({
				lastSeenAt: now,
				updatedAt: now,
			})
			.where(eq(integrationConnections.id, connectionId));

		await db
			.update(obsidianVaults)
			.set({
				lastSeenAt: now,
				updatedAt: now,
			})
			.where(eq(obsidianVaults.vaultId, input.vaultId));

		return {
			vaultId: input.vaultId,
			patterns: scopeItems.map((item) => item.value),
			updatedAt,
		};
	});

const syncBatch = baseRoute
	.input(syncBatchRequestSchema)
	.output(syncBatchResponseSchema)
	.handler(async ({ context, input }) => {
		const userId = context.user?.id;
		if (!userId) {
			throw new ORPCError("Unauthorized");
		}

		console.log("[obsidian.sync] start", {
			vaultId: input.vaultId,
			vaultName: input.vaultName ?? null,
			deviceId: input.deviceId,
			itemCount: input.items.length,
			sentAt: input.sentAt,
		});
		const { connectionId } = await ensureConnectionForVault({
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

		await db
			.update(integrationConnections)
			.set({
				lastSeenAt: now,
			})
			.where(eq(integrationConnections.id, connectionId));

		const vaultRows = await db
			.select({
				deviceIdsJson: obsidianVaults.deviceIdsJson,
			})
			.from(obsidianVaults)
			.where(eq(obsidianVaults.vaultId, input.vaultId))
			.limit(1);

		if (input.deviceId && vaultRows.length > 0) {
			const existing = Array.isArray(vaultRows[0]?.deviceIdsJson) ? vaultRows[0]?.deviceIdsJson : [];
			const nextDeviceIds = Array.from(new Set([...existing, input.deviceId]));

			await db
				.update(obsidianVaults)
				.set({
					deviceIdsJson: nextDeviceIds,
				})
				.where(eq(obsidianVaults.vaultId, input.vaultId));
		}

		await db
			.update(obsidianVaults)
			.set({
				lastSeenAt: now,
				updatedAt: now,
			})
			.where(eq(obsidianVaults.vaultId, input.vaultId));

		console.log("[obsidian.sync] done", {
			vaultId: input.vaultId,
			connectionId,
			accepted: ingestResult.accepted,
			rejected: ingestResult.rejected,
			skipped: ingestResult.skipped,
		});

		return {
			accepted: ingestResult.accepted,
			rejected: ingestResult.rejected,
			itemResults: ingestResult.itemResults,
		};
	});

	const status = baseRoute
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

		const connections = await db
			.select({
				id: integrationConnections.id,
				displayName: integrationConnections.displayName,
				accountExternalId: integrationConnections.accountExternalId,
			})
			.from(integrationConnections)
			.where(and(eq(integrationConnections.userId, userId), eq(integrationConnections.kind, "obsidian")))
			.orderBy(desc(integrationConnections.updatedAt))
			.limit(1);

		// Also check for API keys that indicate Obsidian connection attempts
		const apiKeys = await db
			.select({
				id: apikey.id,
				name: apikey.name,
			})
			.from(apikey)
			.where(and(eq(apikey.userId, userId), eq(apikey.name, "Obsidian Plugin")))
			.limit(1);

		const connection = connections[0];
		const hasApiKey = apiKeys.length > 0;

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
				connected: true,
				vaultId: null,
				vaultName: "Obsidian Vault",
				lastSeenAt: null,
			};
		}

		// At this point, connection is guaranteed to exist since we returned early if it didn't
		if (!connection) {
			throw new ORPCError("INTERNAL_SERVER_ERROR", {
				message: "connection_not_found",
			});
		}

		const vaultRows = await db
			.select({
				lastSeenAt: obsidianVaults.lastSeenAt,
			})
			.from(obsidianVaults)
			.where(eq(obsidianVaults.vaultId, connection.accountExternalId))
			.limit(1);

		return {
			connected: true,
			vaultId: connection.accountExternalId ?? null,
			vaultName: connection.displayName ?? "Obsidian Vault",
			lastSeenAt: vaultRows[0]?.lastSeenAt?.toISOString() ?? null,
		};
	});

const setGlob = baseRoute
	.input(
		z.object({
			vaultId: z.string().min(1).optional(),
			vaultName: z.string().min(1).optional(),
			glob: z.string().nullable().optional(),
		}),
	)
	.output(
		z.object({
			success: z.boolean(),
		}),
	)
	.handler(async ({ context, input }) => {
		const userId = context.user?.id;
		if (!userId) {
			throw new ORPCError("Unauthorized");
		}

		let connectionId: number | null = null;
		if (input.vaultId) {
			const ensured = await ensureConnectionForVault({
				userId,
				vaultId: input.vaultId,
				displayName: input.vaultName,
			});
			connectionId = ensured.connectionId;
		} else {
			const connections = await db
				.select({
					id: integrationConnections.id,
				})
				.from(integrationConnections)
				.where(and(eq(integrationConnections.userId, userId), eq(integrationConnections.kind, "obsidian")))
				.orderBy(desc(integrationConnections.updatedAt))
				.limit(1);

			connectionId = connections[0]?.id ?? null;
		}

		if (!connectionId) {
			throw new ORPCError("NOT_FOUND", { message: "obsidian_not_connected" });
		}

		const nextGlob = input.glob?.trim() ?? "";

		await db.transaction(async (tx) => {
			await tx
				.delete(integrationScopeItems)
				.where(and(eq(integrationScopeItems.connectionId, connectionId), eq(integrationScopeItems.scopeType, "obsidian_glob")));

			if (nextGlob.length > 0) {
				await tx.insert(integrationScopeItems).values({
					connectionId,
					scopeType: "obsidian_glob",
					scopeValue: nextGlob,
					enabled: true,
					metadataJson: null,
				});
			}
		});

		return { success: true };
	});

export const obsidianRouter = {
	register,
	status,
	setGlob,
	scope,
	sync: {
		batch: syncBatch,
	},
};
