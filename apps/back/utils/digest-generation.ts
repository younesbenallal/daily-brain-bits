import { generateNoteDigest } from "@daily-brain-bits/core";
import { db, documents, reviewStates } from "@daily-brain-bits/db";
import { and, eq, isNull } from "drizzle-orm";
import { ORPCError } from "@orpc/server";

type DigestItemInsert = {
	documentId: number;
	position: number;
	contentHashAtSend: string;
};

type DigestPlanResult = {
	items: DigestItemInsert[];
	itemCount: number;
	hasDocuments: boolean;
};

export async function prepareDigestItems(params: {
	userId: string;
	notesPerDigest: number;
	now?: Date;
}): Promise<DigestPlanResult> {
	const now = params.now ?? new Date();
	const documentRows = await db.query.documents.findMany({
		where: and(eq(documents.userId, params.userId), isNull(documents.deletedAtSource)),
		columns: { id: true, contentHash: true },
	});

	if (documentRows.length === 0) {
		return { items: [], itemCount: 0, hasDocuments: false };
	}

	const reviewRows = await db.query.reviewStates.findMany({
		where: eq(reviewStates.userId, params.userId),
		columns: {
			documentId: true,
			status: true,
			nextDueAt: true,
			lastSentAt: true,
			priorityWeight: true,
			deprioritizedUntil: true,
		},
	});

	const reviewMap = new Map(reviewRows.map((row) => [row.documentId, row]));
	const candidates = documentRows.map((doc) => {
		const review = reviewMap.get(doc.id);
		return {
			documentId: doc.id,
			status: review?.status ?? "new",
			nextDueAt: review?.nextDueAt ?? null,
			lastSentAt: review?.lastSentAt ?? null,
			priorityWeight: review?.priorityWeight ?? null,
			deprioritizedUntil: review?.deprioritizedUntil ?? null,
		};
	});

	const plan = generateNoteDigest(candidates, {
		batchSize: params.notesPerDigest,
		now,
	});

	const contentHashMap = new Map(documentRows.map((doc) => [doc.id, doc.contentHash]));
	const digestItems = plan.items.map((item) => {
		const contentHash = contentHashMap.get(item.documentId);
		if (!contentHash) {
			throw new ORPCError("INTERNAL_SERVER_ERROR", { message: "missing_document_hash" });
		}
		return {
			documentId: item.documentId,
			position: item.position,
			contentHashAtSend: contentHash,
		};
	});

	return { items: digestItems, itemCount: plan.items.length, hasDocuments: true };
}
