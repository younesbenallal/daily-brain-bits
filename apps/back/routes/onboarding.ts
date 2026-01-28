import { db, documents, integrationConnections, noteDigests, syncRuns, user } from "@daily-brain-bits/db";
import { ORPCError } from "@orpc/server";
import { and, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { sessionRoute } from "../context";
import { createSeedDigestIfNeeded } from "../utils/seed-note-digest";

const syncStatusSchema = z.enum(["pending", "syncing", "complete", "error"]);

async function getSyncStatus(userId: string): Promise<z.infer<typeof syncStatusSchema>> {
	// Get all active connections for this user
	const connections = await db.query.integrationConnections.findMany({
		where: and(eq(integrationConnections.userId, userId), eq(integrationConnections.status, "active")),
		columns: { id: true },
	});

	if (connections.length === 0) {
		return "pending";
	}

	const connectionIds = connections.map((c) => c.id);

	// Get the most recent sync run for any of the user's connections
	const latestSyncRun = await db.query.syncRuns.findFirst({
		where: inArray(syncRuns.connectionId, connectionIds),
		columns: { status: true },
		orderBy: [desc(syncRuns.createdAt)],
	});

	if (!latestSyncRun) {
		return "pending";
	}

	switch (latestSyncRun.status) {
		case "running":
			return "syncing";
		case "success":
		case "partial":
			return "complete";
		case "failed":
			return "error";
		default:
			return "pending";
	}
}

const status = sessionRoute
	.input(z.object({}).optional())
	.output(
		z.object({
			ready: z.boolean(),
			noteDigestReady: z.boolean(),
			hasDocuments: z.boolean(),
			showOnboarding: z.boolean(),
			syncStatus: syncStatusSchema,
		}),
	)
	.handler(async ({ context }) => {
		const userId = context.user?.id;
		if (!userId) {
			throw new ORPCError("Unauthorized");
		}

		const digest = await db.query.noteDigests.findFirst({
			where: eq(noteDigests.userId, userId),
			columns: { id: true },
			orderBy: [desc(noteDigests.createdAt)],
		});

		const noteDigestReady = Boolean(digest?.id);

		const hasDocuments = Boolean(
			await db.query.documents.findFirst({
				where: eq(documents.userId, userId),
				columns: { id: true },
			}),
		);

		const userRow = await db.query.user.findFirst({
			where: eq(user.id, userId),
			columns: { showOnboarding: true },
		});

		const syncStatus = await getSyncStatus(userId);

		return {
			ready: noteDigestReady,
			noteDigestReady,
			hasDocuments,
			showOnboarding: userRow?.showOnboarding ?? true,
			syncStatus,
		};
	});

const complete = sessionRoute
	.input(z.object({}).optional())
	.output(z.object({ success: z.boolean() }))
	.handler(async ({ context }) => {
		const userId = context.user?.id;
		if (!userId) {
			throw new ORPCError("Unauthorized");
		}

		await db
			.update(user)
			.set({ showOnboarding: false })
			.where(and(eq(user.id, userId), eq(user.showOnboarding, true)));

		return { success: true };
	});

export const onboardingRouter = {
	status,
	seedDigest: sessionRoute
		.input(z.object({}).optional())
		.output(
			z.object({
				created: z.boolean(),
				digestId: z.number().nullable(),
			}),
		)
		.handler(async ({ context }) => {
			const userId = context.user?.id;
			if (!userId) {
				throw new ORPCError("Unauthorized");
			}

			const result = await createSeedDigestIfNeeded(userId);

			return {
				created: result.created,
				digestId: result.created ? result.digestId : null,
			};
		}),
	complete,
};
