import { db, documents, integrationConnections, noteDigestItems, noteDigests, reviewStates } from "@daily-brain-bits/db";
import { ORPCError } from "@orpc/server";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { baseRoute } from "../context";

const MIN_PRIORITY_WEIGHT = 0.1;
const MAX_PRIORITY_WEIGHT = 5;
const PRIORITY_STEP = 0.5;

type DocumentSnapshot = {
	id: number;
	title: string | null;
	contentCiphertext: string;
	contentAlg: string;
	connectionId: number;
};

function decodeContent(document: DocumentSnapshot | undefined): string {
	if (!document || document.contentAlg !== "none") {
		return "";
	}
	try {
		return Buffer.from(document.contentCiphertext, "base64").toString("utf8");
	} catch {
		return "";
	}
}

const today = baseRoute
	.input(z.object({}).optional())
	.output(
		z.object({
			digest: z
				.object({
					id: z.number(),
					scheduledFor: z.string().nullable(),
					createdAt: z.string(),
					status: z.enum(["scheduled", "sent", "failed", "skipped"]),
					items: z.array(
						z.object({
							id: z.number(),
							documentId: z.number(),
							position: z.number(),
							title: z.string().nullable(),
							content: z.string(),
							sourceKind: z.enum(["obsidian", "notion"]).nullable(),
							sourceName: z.string().nullable(),
						}),
					),
				})
				.nullable(),
		}),
	)
	.handler(async ({ context }) => {
		const userId = context.user?.id;
		if (!userId) {
			throw new ORPCError("Unauthorized");
		}

		const digest = await db.query.noteDigests.findFirst({
			where: eq(noteDigests.userId, userId),
			columns: { id: true, scheduledFor: true, createdAt: true, status: true },
			orderBy: [desc(noteDigests.createdAt)],
		});

		if (!digest) {
			return { digest: null };
		}

		const items = await db.query.noteDigestItems.findMany({
			where: eq(noteDigestItems.noteDigestId, digest.id),
			columns: { id: true, documentId: true, position: true },
			orderBy: [asc(noteDigestItems.position)],
		});

		if (items.length === 0) {
			return {
				digest: {
					id: digest.id,
					scheduledFor: digest.scheduledFor ? digest.scheduledFor.toISOString() : null,
					createdAt: digest.createdAt.toISOString(),
					status: digest.status,
					items: [],
				},
			};
		}

		const documentIds = items.map((item) => item.documentId);
		const documentRows = await db.query.documents.findMany({
			where: and(eq(documents.userId, userId), inArray(documents.id, documentIds)),
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
						where: and(eq(integrationConnections.userId, userId), inArray(integrationConnections.id, connectionIds)),
						columns: { id: true, kind: true, displayName: true },
					})
				: [];

		const documentMap = new Map(documentRows.map((document) => [document.id, document]));
		const connectionMap = new Map(connectionRows.map((connection) => [connection.id, connection]));

		const digestItems = items.map((item) => {
			const document = documentMap.get(item.documentId);
			const connection = document ? connectionMap.get(document.connectionId) : undefined;

			return {
				id: item.id,
				documentId: item.documentId,
				position: item.position,
				title: document?.title ?? null,
				content: decodeContent(document),
				sourceKind: connection?.kind ?? null,
				sourceName: connection?.displayName ?? null,
			};
		});

		return {
			digest: {
				id: digest.id,
				scheduledFor: digest.scheduledFor ? digest.scheduledFor.toISOString() : null,
				createdAt: digest.createdAt.toISOString(),
				status: digest.status,
				items: digestItems,
			},
		};
	});

const recommend = baseRoute
	.input(
		z.object({
			documentId: z.number(),
			direction: z.enum(["more", "less"]),
		}),
	)
	.output(
		z.object({
			priorityWeight: z.number(),
		}),
	)
	.handler(async ({ context, input }) => {
		const userId = context.user?.id;
		if (!userId) {
			throw new ORPCError("Unauthorized");
		}

		const document = await db.query.documents.findFirst({
			where: and(eq(documents.id, input.documentId), eq(documents.userId, userId)),
			columns: { id: true },
		});

		if (!document) {
			throw new ORPCError("NOT_FOUND", { message: "document_not_found" });
		}

		const existing = await db.query.reviewStates.findFirst({
			where: and(eq(reviewStates.documentId, input.documentId), eq(reviewStates.userId, userId)),
			columns: { priorityWeight: true },
		});

		const currentWeight = existing?.priorityWeight ?? 1;
		const delta = input.direction === "more" ? PRIORITY_STEP : -PRIORITY_STEP;
		const nextWeight = Math.min(MAX_PRIORITY_WEIGHT, Math.max(MIN_PRIORITY_WEIGHT, currentWeight + delta));
		const now = new Date();

		if (existing) {
			await db
				.update(reviewStates)
				.set({ priorityWeight: nextWeight, updatedAt: now })
				.where(and(eq(reviewStates.documentId, input.documentId), eq(reviewStates.userId, userId)));
		} else {
			await db.insert(reviewStates).values({
				documentId: input.documentId,
				userId,
				status: "new",
				priorityWeight: nextWeight,
				updatedAt: now,
			});
		}

		return { priorityWeight: nextWeight };
	});

export const digestRouter = {
	today,
	recommend,
};
