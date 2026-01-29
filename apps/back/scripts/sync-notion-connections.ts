import { env } from "../infra/env";
import { getAllActiveNotionConnections, syncNotionConnection } from "../domains/notion/sync-connection";

void env;

const DELAY_BETWEEN_CONNECTIONS_MS = 2000;

function sleep(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function runSyncNotionConnections() {
	console.info("[sync-notion-connections] Starting scheduled Notion sync");

	const connections = await getAllActiveNotionConnections();
	console.info("[sync-notion-connections] Found %d active Notion connections", connections.length);

	if (connections.length === 0) {
		console.info("[sync-notion-connections] No connections to sync");
		return { synced: 0, failed: 0, totalDocuments: 0 };
	}

	let synced = 0;
	let failed = 0;
	let totalDocuments = 0;

	for (const connection of connections) {
		try {
			const result = await syncNotionConnection({
				connectionId: connection.connectionId,
				userId: connection.userId,
				tokens: connection.tokens,
				syncKind: "incremental",
			});

			if (result.success) {
				synced += 1;
				totalDocuments += result.totalDocumentsImported;
			} else {
				failed += 1;
				console.error("[sync-notion-connections] Sync failed for connection", {
					connectionId: connection.connectionId,
					userId: connection.userId,
					error: result.error,
				});
			}
		} catch (error) {
			failed += 1;
			console.error("[sync-notion-connections] Unexpected error for connection", {
				connectionId: connection.connectionId,
				userId: connection.userId,
				error: error instanceof Error ? error.message : "Unknown error",
			});
		}

		if (connections.indexOf(connection) < connections.length - 1) {
			await sleep(DELAY_BETWEEN_CONNECTIONS_MS);
		}
	}

	console.info("[sync-notion-connections] Completed", {
		synced,
		failed,
		totalDocuments,
	});

	return { synced, failed, totalDocuments };
}

if (import.meta.main) {
	runSyncNotionConnections()
		.then((result) => {
			console.info("[sync-notion-connections] Script finished", result);
			process.exit(0);
		})
		.catch((error) => {
			console.error("[sync-notion-connections] Script failed", error);
			process.exit(1);
		});
}
