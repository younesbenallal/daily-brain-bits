import { generateNoteDigest } from "@daily-brain-bits/core";
import { db, documents, integrationConnections, noteDigestItems, noteDigests, reviewStates, userSettings } from "@daily-brain-bits/db";
import { ORPCError } from "@orpc/server";
import { and, asc, desc, eq, inArray, isNull } from "drizzle-orm";
import { z } from "zod";
import { baseRoute } from "../context";

const MIN_PRIORITY_WEIGHT = 0.1;
const MAX_PRIORITY_WEIGHT = 5;
const PRIORITY_STEP = 0.5;
const DEFAULT_NOTES_PER_DIGEST = 5;

type DocumentSnapshot = {
	id: number;
	title: string | null;
	contentCiphertext: string;
	contentAlg: string;
	connectionId: number;
	metadataJson: unknown | null;
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

function asRecord(value: unknown): Record<string, unknown> | null {
	if (!value || typeof value !== "object" || Array.isArray(value)) {
		return null;
	}
	return value as Record<string, unknown>;
}

function extractDocumentProperties(metadata: unknown): Record<string, unknown> | null {
	const record = asRecord(metadata);
	if (!record) {
		return null;
	}
	const propertiesSummary = asRecord(record.propertiesSummary);
	if (propertiesSummary) {
		return propertiesSummary;
	}
	const frontmatter = asRecord(record.frontmatter);
	if (frontmatter) {
		return frontmatter;
	}
	return null;
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
							properties: z.record(z.string(), z.unknown()).nullable(),
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
				metadataJson: true,
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
			const properties = extractDocumentProperties(document?.metadataJson);
			const metadataRecord = asRecord(document?.metadataJson);

			if (!properties) {
				console.log("[digest.today] no properties", {
					documentId: item.documentId,
					sourceKind: connection?.kind ?? null,
					metadataKeys: metadataRecord ? Object.keys(metadataRecord) : [],
				});
			} else {
				console.log("[digest.today] properties", {
					documentId: item.documentId,
					sourceKind: connection?.kind ?? null,
					propertyKeys: Object.keys(properties),
				});
			}

			return {
				id: item.id,
				documentId: item.documentId,
				position: item.position,
				title: document?.title ?? null,
				content: decodeContent(document),
				properties,
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

const regenerate = baseRoute
	.input(z.object({}).optional())
	.output(
		z.object({
			digestId: z.number().nullable(),
			itemCount: z.number(),
		}),
	)
	.handler(async ({ context }) => {
		const userId = context.user?.id;
		if (!userId) {
			throw new ORPCError("Unauthorized");
		}

		console.log("[digest.regenerate] start", { userId });

		const settings = await db.query.userSettings.findFirst({
			where: eq(userSettings.userId, userId),
			columns: { notesPerDigest: true },
		});
		const notesPerDigest = settings?.notesPerDigest ?? DEFAULT_NOTES_PER_DIGEST;
		console.log("[digest.regenerate] settings", { userId, notesPerDigest });

		const existingDigest = await db.query.noteDigests.findFirst({
			where: eq(noteDigests.userId, userId),
			columns: { id: true },
			orderBy: [desc(noteDigests.createdAt)],
		});

		const documentRows = await db.query.documents.findMany({
			where: and(eq(documents.userId, userId), isNull(documents.deletedAtSource)),
			columns: { id: true, contentHash: true },
		});
		console.log("[digest.regenerate] documents", { userId, count: documentRows.length });

		if (documentRows.length === 0) {
			const now = new Date();
			let digestId: number | null = existingDigest?.id ?? null;

			if (digestId) {
				await db.transaction(async (tx) => {
					await tx.delete(noteDigestItems).where(eq(noteDigestItems.noteDigestId, digestId));
					await tx
						.update(noteDigests)
						.set({ scheduledFor: now, sentAt: null, status: "scheduled", updatedAt: now })
						.where(eq(noteDigests.id, digestId));
				});
			} else {
				const [digest] = await db
					.insert(noteDigests)
					.values({
						userId,
						scheduledFor: now,
						status: "scheduled",
					})
					.returning({ id: noteDigests.id });
				digestId = digest?.id ?? null;
			}

			console.log("[digest.regenerate] no documents available", { userId, digestId });
			return { digestId, itemCount: 0 };
		}

		const reviewRows = await db.query.reviewStates.findMany({
			where: eq(reviewStates.userId, userId),
			columns: {
				documentId: true,
				status: true,
				nextDueAt: true,
				lastSentAt: true,
				priorityWeight: true,
				deprioritizedUntil: true,
			},
		});
		console.log("[digest.regenerate] review states", { userId, count: reviewRows.length });

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
			batchSize: notesPerDigest,
			now: new Date(),
		});
		console.log("[digest.regenerate] plan", { userId, itemCount: plan.items.length, skipped: plan.skipped.length });

		const now = new Date();
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

		let digestId = existingDigest?.id ?? null;
		await db.transaction(async (tx) => {
			if (digestId) {
				await tx.delete(noteDigestItems).where(eq(noteDigestItems.noteDigestId, digestId));
				await tx
					.update(noteDigests)
					.set({ scheduledFor: now, sentAt: null, status: "scheduled", updatedAt: now })
					.where(eq(noteDigests.id, digestId));
			} else {
				const [digest] = await tx
					.insert(noteDigests)
					.values({
						userId,
						scheduledFor: now,
						status: "scheduled",
					})
					.returning({ id: noteDigests.id });
				if (!digest?.id) {
					throw new ORPCError("INTERNAL_SERVER_ERROR", { message: "digest_create_failed" });
				}
				digestId = digest.id;
			}

			if (digestId && digestItems.length > 0) {
				await tx.insert(noteDigestItems).values(
					digestItems.map((item) => ({
						noteDigestId: digestId as number,
						...item,
					})),
				);
			}
		});

		console.log("[digest.regenerate] replaced", {
			userId,
			digestId,
			itemCount: plan.items.length,
		});

		return { digestId, itemCount: plan.items.length };
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
	regenerate,
	recommend,
};
