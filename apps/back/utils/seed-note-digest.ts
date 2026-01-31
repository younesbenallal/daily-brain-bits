import { db, documents, noteDigestItems, noteDigests, userSettings } from "@daily-brain-bits/db";
import { and, desc, eq, isNull } from "drizzle-orm";

export type SeedDigestResult =
	| { created: true; digestId: number; itemCount: number }
	| { created: false; reason: "already_exists" | "no_documents" | "insert_failed" };

export async function createSeedDigestIfNeeded(userId: string): Promise<SeedDigestResult> {
	const existing = await db.query.noteDigests.findFirst({
		where: eq(noteDigests.userId, userId),
		columns: { id: true },
		orderBy: [desc(noteDigests.createdAt)],
	});

	if (existing?.id) {
		return { created: false, reason: "already_exists" };
	}

	const settings = await db.query.userSettings.findFirst({
		where: eq(userSettings.userId, userId),
		columns: { notesPerDigest: true },
	});
	const notesPerDigest = settings?.notesPerDigest ?? 5;

	const seedDocuments = await db.query.documents.findMany({
		where: and(eq(documents.userId, userId), isNull(documents.deletedAtSource)),
		columns: { id: true, contentHash: true },
		orderBy: [desc(documents.lastSyncedAt)],
		limit: notesPerDigest,
	});

	if (seedDocuments.length === 0) {
		return { created: false, reason: "no_documents" };
	}

	console.log("[noteDigest] Creating seed digest with documents", {
		userId,
		documentCount: seedDocuments.length,
	});

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
		console.error("[noteDigest] Failed to create seed digest", { userId });
		return { created: false, reason: "insert_failed" };
	}

	await db.insert(noteDigestItems).values(
		seedDocuments.map((doc, index) => ({
			noteDigestId: digest.id,
			documentId: doc.id,
			position: index + 1,
			contentHashAtSend: doc.contentHash,
		})),
	);

	console.log("[noteDigest] Seed digest created successfully", {
		userId,
		digestId: digest.id,
		itemCount: seedDocuments.length,
	});

	return { created: true, digestId: digest.id, itemCount: seedDocuments.length };
}
