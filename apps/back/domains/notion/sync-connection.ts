import { account, db, integrationConnections, integrationScopeItems, syncRuns, syncState } from "@daily-brain-bits/db";
import { createNotionClient, createNotionSyncAdapter } from "@daily-brain-bits/integrations-notion";
import { and, eq } from "drizzle-orm";
import { runSyncPipeline } from "../../integrations/sync-pipeline";
import { captureBackendEvent } from "../../infra/posthog-client";

type NotionConnectionTokens = {
	accessToken: string;
	refreshToken?: string | null;
};

export type SyncNotionConnectionParams = {
	connectionId: number;
	userId: string;
	tokens: NotionConnectionTokens;
	syncKind?: "manual" | "incremental";
};

export type SyncNotionConnectionResult = {
	success: boolean;
	databasesSynced: number;
	totalDocumentsImported: number;
	error?: string;
};

export async function syncNotionConnection(params: SyncNotionConnectionParams): Promise<SyncNotionConnectionResult> {
	const { connectionId, userId, tokens, syncKind = "manual" } = params;

	console.log("[notion.sync] Starting Notion sync", { userId, connectionId, syncKind });

	const scopeItems = await db
		.select({
			scopeValue: integrationScopeItems.scopeValue,
		})
		.from(integrationScopeItems)
		.where(
			and(
				eq(integrationScopeItems.connectionId, connectionId),
				eq(integrationScopeItems.scopeType, "notion_database"),
				eq(integrationScopeItems.enabled, true),
			),
		);

	const databaseIds = scopeItems.map((item) => item.scopeValue);

	if (databaseIds.length === 0) {
		console.log("[notion.sync] No databases enabled for sync", { userId, connectionId });
		return {
			success: true,
			databasesSynced: 0,
			totalDocumentsImported: 0,
		};
	}

	console.log("[notion.sync] Syncing databases", {
		userId,
		connectionId,
		databaseCount: databaseIds.length,
		databaseIds,
	});

	const now = new Date();
	const [syncRun] = await db
		.insert(syncRuns)
		.values({
			connectionId,
			kind: syncKind,
			status: "running",
			statsJson: { accepted: 0, rejected: 0, databasesSynced: 0 },
			startedAt: now,
		})
		.returning({ id: syncRuns.id });

	const syncRunId = syncRun?.id;

	try {
		const state = await db.query.syncState.findFirst({
			where: eq(syncState.connectionId, connectionId),
			columns: { cursorJson: true },
		});

		const cursor = state?.cursorJson && typeof state.cursorJson === "object" ? (state.cursorJson as { since?: string }) : undefined;

		const notion = createNotionClient(tokens.accessToken);
		const adapter = createNotionSyncAdapter({ notion });

		let totalDocumentsImported = 0;

		for (const databaseId of databaseIds) {
			console.log("[notion.sync] Syncing database", {
				userId,
				connectionId,
				databaseId,
			});

			const syncResult = await adapter.sync({ databaseId }, cursor ? { since: cursor.since ?? new Date().toISOString() } : undefined);

			console.log("[notion.sync] Database sync completed", {
				userId,
				connectionId,
				databaseId,
				itemsFound: syncResult.items.length,
				stats: syncResult.stats,
			});

			if (syncResult.items.length > 0) {
				const ingestResult = await runSyncPipeline({
					connectionId,
					userId,
					items: syncResult.items,
					receivedAt: now,
					sourceKind: "notion",
					nextCursor: syncResult.nextCursor,
				});

				totalDocumentsImported += ingestResult.accepted;

				console.log("[notion.sync] Database ingestion completed", {
					userId,
					connectionId,
					databaseId,
					accepted: ingestResult.accepted,
					rejected: ingestResult.rejected,
					skipped: ingestResult.skipped,
				});
			}
		}

		if (syncRunId) {
			await db
				.update(syncRuns)
				.set({
					status: "success",
					statsJson: { accepted: totalDocumentsImported, rejected: 0, databasesSynced: databaseIds.length },
					finishedAt: new Date(),
				})
				.where(eq(syncRuns.id, syncRunId));
		}

		console.log("[notion.sync] Notion sync completed", {
			userId,
			connectionId,
			syncRunId,
			databasesSynced: databaseIds.length,
			totalDocumentsImported,
		});

		captureBackendEvent({
			distinctId: userId,
			event: "Notion sync completed",
			properties: {
				source_kind: "notion",
				sync_kind: syncKind,
				databases_synced: databaseIds.length,
				documents_imported: totalDocumentsImported,
			},
		});

		return {
			success: true,
			databasesSynced: databaseIds.length,
			totalDocumentsImported,
		};
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : "Unknown error";

		if (syncRunId) {
			await db
				.update(syncRuns)
				.set({
					status: "failed",
					errorJson: { message: errorMessage },
					finishedAt: new Date(),
				})
				.where(eq(syncRuns.id, syncRunId));
		}

		console.error("[notion.sync] Sync failed", {
			userId,
			connectionId,
			error: errorMessage,
		});

		return {
			success: false,
			databasesSynced: 0,
			totalDocumentsImported: 0,
			error: errorMessage,
		};
	}
}

export async function getActiveNotionConnectionWithTokens(userId: string) {
	const connection = await db.query.integrationConnections.findFirst({
		where: and(eq(integrationConnections.userId, userId), eq(integrationConnections.kind, "notion"), eq(integrationConnections.status, "active")),
		columns: {
			id: true,
			accountExternalId: true,
			displayName: true,
			configJson: true,
			updatedAt: true,
		},
	});

	if (!connection) {
		return null;
	}

	const accountRow = await db.query.account.findFirst({
		where: and(eq(account.userId, userId), eq(account.providerId, "notion"), eq(account.accountId, connection.accountExternalId)),
		columns: {
			accessToken: true,
			refreshToken: true,
		},
	});

	if (!accountRow?.accessToken) {
		return null;
	}

	return {
		connection,
		tokens: {
			accessToken: accountRow.accessToken,
			refreshToken: accountRow.refreshToken ?? null,
		},
	};
}

export async function getAllActiveNotionConnections() {
	const connections = await db
		.select({
			id: integrationConnections.id,
			userId: integrationConnections.userId,
			accountExternalId: integrationConnections.accountExternalId,
		})
		.from(integrationConnections)
		.where(and(eq(integrationConnections.kind, "notion"), eq(integrationConnections.status, "active")));

	const results: Array<{
		connectionId: number;
		userId: string;
		tokens: NotionConnectionTokens;
	}> = [];

	for (const connection of connections) {
		const accountRow = await db.query.account.findFirst({
			where: and(
				eq(account.userId, connection.userId),
				eq(account.providerId, "notion"),
				eq(account.accountId, connection.accountExternalId),
			),
			columns: {
				accessToken: true,
				refreshToken: true,
			},
		});

		if (accountRow?.accessToken) {
			results.push({
				connectionId: connection.id,
				userId: connection.userId,
				tokens: {
					accessToken: accountRow.accessToken,
					refreshToken: accountRow.refreshToken ?? null,
				},
			});
		}
	}

	return results;
}
