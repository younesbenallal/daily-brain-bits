import type { SyncCursor } from "@daily-brain-bits/core";
import { db, documents, noteDigestItems, noteDigests } from "@daily-brain-bits/db";
import type { IntegrationKind } from "@daily-brain-bits/types";
import { and, desc, eq, isNull } from "drizzle-orm";
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

async function ensureSeedNoteDigest(userId: string) {
	const existing = await db.query.noteDigests.findFirst({
		where: eq(noteDigests.userId, userId),
		columns: { id: true },
		orderBy: [desc(noteDigests.createdAt)],
	});

	if (existing?.id) {
		return;
	}

	const seedDocuments = await db.query.documents.findMany({
		where: and(eq(documents.userId, userId), isNull(documents.deletedAtSource)),
		columns: { id: true, contentHash: true },
		orderBy: [desc(documents.lastSyncedAt)],
		limit: 6,
	});

	if (seedDocuments.length === 0) {
		return;
	}

	const now = new Date();
	const [digest] = await db
		.insert(noteDigests)
		.values({
			userId,
			scheduledFor: now,
			status: "scheduled",
		})
		.returning({ id: noteDigests.id });

	if (!digest?.id) {
		return;
	}

	await db.insert(noteDigestItems).values(
		seedDocuments.map((doc, index) => ({
			noteDigestId: digest.id,
			documentId: doc.id,
			position: index,
			contentHashAtSend: doc.contentHash,
		})),
	);
}

export async function runSyncPipeline(params: SyncPipelineParams): Promise<IngestResult> {
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

	if (ingestResult.accepted > 0) {
		await ensureSeedNoteDigest(params.userId);
	}

	return {
		accepted: ingestResult.accepted,
		rejected: ingestResult.rejected + rejected,
		skipped: ingestResult.skipped,
		itemResults: [...itemResults, ...ingestResult.itemResults],
	};
}
