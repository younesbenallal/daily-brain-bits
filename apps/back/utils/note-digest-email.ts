import { db, documents, integrationConnections, noteDigestItems, noteDigests } from "@daily-brain-bits/db";
import { and, asc, eq, inArray } from "drizzle-orm";
import { decodeDocumentContent } from "./document-content";
import { buildDigestEmail, buildEmailContent, type DigestEmailItem, type DigestSnapshot } from "./note-digest-email-template";

export async function loadDigestSnapshot(params: { userId: string; digestId: number }): Promise<DigestSnapshot | null> {
	const digest = await db.query.noteDigests.findFirst({
		where: and(eq(noteDigests.userId, params.userId), eq(noteDigests.id, params.digestId)),
		columns: { id: true, createdAt: true },
	});

	if (!digest) {
		return null;
	}

	const items = await db.query.noteDigestItems.findMany({
		where: eq(noteDigestItems.noteDigestId, params.digestId),
		columns: { id: true, documentId: true, position: true },
		orderBy: [asc(noteDigestItems.position)],
	});

	if (items.length === 0) {
		return { digestId: digest.id, createdAt: digest.createdAt, items: [] };
	}

	const documentIds = items.map((item) => item.documentId);
	const documentRows = await db.query.documents.findMany({
		where: and(eq(documents.userId, params.userId), inArray(documents.id, documentIds)),
		columns: {
			id: true,
			title: true,
			contentCiphertext: true,
			contentAlg: true,
			connectionId: true,
		},
	});

	const connectionIds = Array.from(new Set(documentRows.map((document) => document.connectionId)));
	const connectionRows =
		connectionIds.length > 0
			? await db.query.integrationConnections.findMany({
					where: and(eq(integrationConnections.userId, params.userId), inArray(integrationConnections.id, connectionIds)),
					columns: { id: true, kind: true, displayName: true },
				})
			: [];

	const documentMap = new Map(documentRows.map((document) => [document.id, document]));
	const connectionMap = new Map(connectionRows.map((connection) => [connection.id, connection]));

	const digestItems: DigestEmailItem[] = items.map((item) => {
		const document = documentMap.get(item.documentId);
		const connection = document ? connectionMap.get(document.connectionId) : undefined;
		const content = decodeDocumentContent(document);
		const title = document?.title?.trim() || "Untitled note";
		const emailContent = buildEmailContent(content);

		return {
			documentId: item.documentId,
			title,
			excerpt: emailContent.excerpt,
			blocks: emailContent.blocks,
			sourceKind: connection?.kind ?? null,
			sourceName: connection?.displayName ?? null,
		};
	});

	return {
		digestId: digest.id,
		createdAt: digest.createdAt,
		items: digestItems,
	};
}

export { buildDigestEmail };
