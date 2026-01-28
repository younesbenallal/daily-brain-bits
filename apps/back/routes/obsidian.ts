import { apikey, db, integrationConnections, syncRuns } from "@daily-brain-bits/db";
import {
	obsidianConnectionConfigSchema,
	obsidianConnectRequestSchema,
	obsidianConnectResponseSchema,
	parseObsidianConnectionConfig,
	syncBatchRequestSchema,
	syncBatchResponseSchema,
} from "@daily-brain-bits/integrations-obsidian";
import { ORPCError } from "@orpc/server";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { authenticatedRoute } from "../context";
import { runSyncPipeline } from "../integrations/sync-pipeline";
import { captureBackendEvent } from "../infra/posthog-client";
import { activateOnboardingSequence } from "../infra/trigger-client";
import { checkSourceLimitForConnection } from "../utils/plan-enforcement";

function buildObsidianConfig(options: { vaultId: string; deviceIds?: string[]; settings?: Record<string, unknown> }) {
	return obsidianConnectionConfigSchema.parse({
		vaultId: options.vaultId,
		deviceIds: options.deviceIds ?? [],
		settings: options.settings ?? {},
	});
}

const connect = authenticatedRoute
	.input(obsidianConnectRequestSchema)
	.output(obsidianConnectResponseSchema)
	.handler(async ({ context, input }) => {
		const userId = context.user?.id;
		if (!userId) {
			throw new ORPCError("Unauthorized");
		}

		console.log("[obsidian.connect] start", {
			userId,
			vaultId: input.vaultId,
			vaultName: input.vaultName ?? null,
		});
		const { connectionId, displayName, config } = await getOrCreateConnectionForVault({
			userId,
			vaultId: input.vaultId,
			displayName: input.vaultName,
		});

		const now = new Date();
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

		console.log("[obsidian.connect] ok", {
			userId,
			vaultId: input.vaultId,
			connectionId,
			displayName,
		});

		await activateOnboardingSequence(userId);

		return {
			connected: true,
			connectionId,
		};
	});

async function getOrCreateConnectionForVault(options: { userId: string; vaultId: string; displayName?: string }) {
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
	const sourceLimit = await checkSourceLimitForConnection({ userId });
	if (!sourceLimit.allowed) {
		throw new ORPCError("FORBIDDEN", {
			message: "source_limit_reached",
			cause: {
				currentCount: sourceLimit.currentCount,
				limit: sourceLimit.limit,
			},
		});
	}
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

async function getOrCreateRunningSyncRun(connectionId: number): Promise<number> {
	// Check if there's an existing running sync run for this connection
	const existingRun = await db.query.syncRuns.findFirst({
		where: and(eq(syncRuns.connectionId, connectionId), eq(syncRuns.status, "running")),
		columns: { id: true },
	});

	if (existingRun) {
		return existingRun.id;
	}

	// Create a new sync run
	const now = new Date();
	const [newRun] = await db
		.insert(syncRuns)
		.values({
			connectionId,
			kind: "manual",
			status: "running",
			statsJson: { accepted: 0, rejected: 0 },
			startedAt: now,
		})
		.returning({ id: syncRuns.id });

	if (!newRun) {
		throw new ORPCError("INTERNAL_SERVER_ERROR", {
			message: "failed_to_create_sync_run",
		});
	}

	return newRun.id;
}

const syncBatch = authenticatedRoute
	.input(syncBatchRequestSchema)
	.output(syncBatchResponseSchema)
	.handler(async ({ context, input }) => {
		const userId = context.user?.id;
		if (!userId) {
			throw new ORPCError("Unauthorized");
		}

		console.log("[obsidian.sync.batch] start", {
			userId,
			vaultId: input.vaultId,
			vaultName: input.vaultName,
			deviceId: input.deviceId,
			itemCount: input.items.length,
		});

		const { connectionId, config } = await getOrCreateConnectionForVault({
			userId,
			vaultId: input.vaultId,
			displayName: input.vaultName,
		});

		await activateOnboardingSequence(userId);

		if (!connectionId) {
			throw new ORPCError("INTERNAL_SERVER_ERROR", {
				message: "failed_to_get_connection",
			});
		}

		// Get or create a running sync run for tracking
		const syncRunId = await getOrCreateRunningSyncRun(connectionId);

		const now = new Date();
		const ingestResult = await runSyncPipeline({
			connectionId,
			userId,
			items: input.items,
			receivedAt: now,
			sourceKind: "obsidian",
			defaultDeletedAtSource: input.sentAt,
		});

		// Update sync run stats (accumulate accepted/rejected counts)
		const currentRun = await db.query.syncRuns.findFirst({
			where: eq(syncRuns.id, syncRunId),
			columns: { statsJson: true },
		});
		const currentStats =
			currentRun?.statsJson && typeof currentRun.statsJson === "object"
				? (currentRun.statsJson as { accepted?: number; rejected?: number })
				: { accepted: 0, rejected: 0 };

		await db
			.update(syncRuns)
			.set({
				statsJson: {
					accepted: (currentStats.accepted ?? 0) + ingestResult.accepted,
					rejected: (currentStats.rejected ?? 0) + ingestResult.rejected,
				},
			})
			.where(eq(syncRuns.id, syncRunId));

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

		console.log("[obsidian.sync.batch] complete", {
			userId,
			connectionId,
			syncRunId,
			accepted: ingestResult.accepted,
			rejected: ingestResult.rejected,
			itemResultsCount: ingestResult.itemResults.length,
		});

		captureBackendEvent({
			distinctId: userId,
			event: "Obsidian sync batch completed",
			properties: {
				source_kind: "obsidian",
				connection_id: connectionId,
				item_count: input.items.length,
				accepted: ingestResult.accepted,
				rejected: ingestResult.rejected,
			},
		});

		return {
			accepted: ingestResult.accepted,
			rejected: ingestResult.rejected,
			itemResults: ingestResult.itemResults,
		};
	});

const status = authenticatedRoute
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

const syncComplete = authenticatedRoute
	.input(
		z.object({
			vaultId: z.string().min(1),
		}),
	)
	.output(
		z.object({
			success: z.boolean(),
			syncRunId: z.number().nullable(),
		}),
	)
	.handler(async ({ context, input }) => {
		const userId = context.user?.id;
		if (!userId) {
			throw new ORPCError("Unauthorized");
		}

		console.log("[obsidian.sync.complete] start", {
			userId,
			vaultId: input.vaultId,
		});

		// Find the connection for this vault
		const connection = await db.query.integrationConnections.findFirst({
			where: and(
				eq(integrationConnections.userId, userId),
				eq(integrationConnections.kind, "obsidian"),
				eq(integrationConnections.accountExternalId, input.vaultId),
			),
			columns: { id: true },
		});

		if (!connection) {
			console.log("[obsidian.sync.complete] no connection found", {
				userId,
				vaultId: input.vaultId,
			});
			return { success: false, syncRunId: null };
		}

		// Find the running sync run and mark it as success
		const runningRun = await db.query.syncRuns.findFirst({
			where: and(eq(syncRuns.connectionId, connection.id), eq(syncRuns.status, "running")),
			columns: { id: true },
		});

		if (!runningRun) {
			console.log("[obsidian.sync.complete] no running sync run found", {
				userId,
				connectionId: connection.id,
			});
			return { success: true, syncRunId: null };
		}

		const now = new Date();
		await db
			.update(syncRuns)
			.set({
				status: "success",
				finishedAt: now,
			})
			.where(eq(syncRuns.id, runningRun.id));

		console.log("[obsidian.sync.complete] ok", {
			userId,
			connectionId: connection.id,
			syncRunId: runningRun.id,
		});

		captureBackendEvent({
			distinctId: userId,
			event: "Obsidian sync completed",
			properties: {
				source_kind: "obsidian",
				connection_id: connection.id,
				sync_run_id: runningRun.id,
			},
		});

		return { success: true, syncRunId: runningRun.id };
	});

export const obsidianRouter = {
	connect,
	status,
	sync: {
		batch: syncBatch,
		complete: syncComplete,
	},
};
