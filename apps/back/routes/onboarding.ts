import { normalizeForHash, sha256Hex } from "@daily-brain-bits/core";
import { db, documents, integrationConnections, user } from "@daily-brain-bits/db";
import { ORPCError } from "@orpc/server";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { baseRoute } from "../context";

const MOCK_EMAIL_BATCH_DELAY_MS = 30_000;
const MOCK_NOTE_COUNT = 24;
const mockStartByUser = new Map<string, number>();

function encodeContent(contentMarkdown: string) {
	return {
		contentCiphertext: Buffer.from(contentMarkdown, "utf8").toString("base64"),
		contentIv: "none",
		contentAlg: "none",
		contentKeyVersion: 0,
		contentSizeBytes: Buffer.byteLength(contentMarkdown, "utf8"),
	};
}

function buildMockNote(index: number) {
	const topics = [
		"atomic habits",
		"systems thinking",
		"spaced repetition",
		"cognitive bias",
		"learning loops",
		"deep work",
		"memory cues",
		"deliberate practice",
		"knowledge graphs",
		"feedback loops",
	];
	const topic = topics[index % topics.length];
	const title = `Mock note ${index + 1}: ${topic}`;
	const content = `# ${title}\n\n- Key idea: ${topic}\n- Example: ${topic} applied to daily notes\n- Action: review this later\n`;
	return { title, content };
}

async function ensureMockDocuments(userId: string) {
	const [connection] = await db
		.select({ id: integrationConnections.id })
		.from(integrationConnections)
		.where(eq(integrationConnections.userId, userId))
		.orderBy(desc(integrationConnections.updatedAt))
		.limit(1);

	if (!connection?.id) {
		return false;
	}

	for (let i = 0; i < MOCK_NOTE_COUNT; i += 1) {
		const { title, content } = buildMockNote(i);
		const contentHash = sha256Hex(normalizeForHash(content));
		const externalId = `mock::${userId}::${i}`;
		const path = `Mock/Note ${i + 1}.md`;
		const now = new Date();

		await db
			.insert(documents)
			.values({
				userId,
				connectionId: connection.id,
				externalId,
				title,
				contentHash,
				createdAtSource: null,
				updatedAtSource: now,
				deletedAtSource: null,
				lastSyncedAt: now,
				metadataJson: { path, mock: true },
				...encodeContent(content),
			})
			.onConflictDoNothing();
	}

	return true;
}

const status = baseRoute
	.input(z.object({}).optional())
	.output(
		z.object({
			ready: z.boolean(),
			hasDocuments: z.boolean(),
			showOnboarding: z.boolean(),
		}),
	)
	.handler(async ({ context }) => {
		const userId = context.user?.id;
		if (!userId) {
			throw new ORPCError("Unauthorized");
		}

		const startedAt = mockStartByUser.get(userId) ?? Date.now();
		if (!mockStartByUser.has(userId)) {
			mockStartByUser.set(userId, startedAt);
		}
		await ensureMockDocuments(userId);
		const elapsed = Date.now() - startedAt;

		const userRow = await db.query.user.findFirst({
			where: eq(user.id, userId),
			columns: { showOnboarding: true },
		});

		return {
			ready: elapsed >= MOCK_EMAIL_BATCH_DELAY_MS,
			hasDocuments: true,
			showOnboarding: userRow?.showOnboarding ?? true,
		};
	});

const complete = baseRoute
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
	complete,
};
