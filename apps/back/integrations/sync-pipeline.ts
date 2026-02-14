import type { SyncCursor } from "@daily-brain-bits/core";
import type { IntegrationKind } from "@daily-brain-bits/types";
import { type IngestResult, ingestSyncItems } from "./ingest";

type ScopeFilterResult = {
	filteredItems: unknown[];
	rejected: number;
	itemResults: IngestResult["itemResults"];
};

export type SyncPipelineParams = {
	connectionId: number;
	userId: string;
	items: unknown[];
	receivedAt: Date;
	sourceKind: IntegrationKind;
	nextCursor?: SyncCursor | null;
	defaultDeletedAtSource?: string | null;
};

async function applyScopeFilter(params: Pick<SyncPipelineParams, "items">): Promise<ScopeFilterResult> {
	return { filteredItems: params.items, rejected: 0, itemResults: [] };
}

export async function runSyncPipeline(params: SyncPipelineParams): Promise<IngestResult> {
	console.log("[sync] Starting sync pipeline", {
		userId: params.userId,
		connectionId: params.connectionId,
		sourceKind: params.sourceKind,
		itemCount: params.items.length,
	});

	const { filteredItems, rejected, itemResults } = await applyScopeFilter({
		items: params.items,
	});

	const ingestResult = await ingestSyncItems({
		connectionId: params.connectionId,
		userId: params.userId,
		items: filteredItems,
		receivedAt: params.receivedAt,
		nextCursor: params.nextCursor,
	});

	console.log("[sync] Sync pipeline completed", {
		userId: params.userId,
		connectionId: params.connectionId,
		sourceKind: params.sourceKind,
		accepted: ingestResult.accepted,
		rejected: ingestResult.rejected + rejected,
		skipped: ingestResult.skipped,
		totalDocumentsImported: ingestResult.accepted,
	});

	return {
		accepted: ingestResult.accepted,
		rejected: ingestResult.rejected + rejected,
		skipped: ingestResult.skipped,
		itemResults: [...itemResults, ...ingestResult.itemResults],
	};
}
