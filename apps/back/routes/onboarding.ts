import { db, documents, noteDigests, user } from "@daily-brain-bits/db";
import { ORPCError } from "@orpc/server";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { sessionRoute } from "../context";
import { createSeedDigestIfNeeded } from "../utils/seed-note-digest";

const status = sessionRoute
	.input(z.object({}).optional())
	.output(
		z.object({
			ready: z.boolean(),
			noteDigestReady: z.boolean(),
			hasDocuments: z.boolean(),
			showOnboarding: z.boolean(),
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

		return {
			ready: noteDigestReady,
			noteDigestReady,
			hasDocuments,
			showOnboarding: userRow?.showOnboarding ?? true,
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
