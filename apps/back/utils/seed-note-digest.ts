import { db, documents, integrationConnections, noteDigestItems, noteDigests, syncRuns, userSettings } from "@daily-brain-bits/db";
import { and, desc, eq, inArray, isNull } from "drizzle-orm";

export type SeedDigestResult =
	| { created: true; digestId: number; itemCount: number }
	| { created: false; reason: "already_exists" | "no_documents" | "insert_failed" | "sync_in_progress" };

export async function createSeedDigestIfNeeded(userId: string): Promise<SeedDigestResult> {
	const activeConnections = await db.query.integrationConnections.findMany({
		where: and(eq(integrationConnections.userId, userId), eq(integrationConnections.status, "active")),
		columns: { id: true },
	});
	const activeConnectionIds = activeConnections.map((connection) => connection.id);

	if (activeConnectionIds.length > 0) {
		const runningSync = await db.query.syncRuns.findFirst({
			where: and(inArray(syncRuns.connectionId, activeConnectionIds), eq(syncRuns.status, "running")),
			columns: { id: true },
		});

		if (runningSync) {
			return { created: false, reason: "sync_in_progress" };
		}
	}

	const existing = await db.query.noteDigests.findFirst({
		where: eq(noteDigests.userId, userId),
		columns: { id: true, status: true },
		orderBy: [desc(noteDigests.createdAt)],
	});

	// Allow seeding if no digest exists OR if the existing one was skipped (e.g., cron ran before sync)
	if (existing?.id && existing.status !== "skipped") {
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

	const now = new Date();
	let digestId: number;

	// If we have a skipped digest, update it instead of creating a new one
	if (existing?.id && existing.status === "skipped") {
		console.log("[noteDigest] Updating skipped digest with documents", {
			userId,
			digestId: existing.id,
			documentCount: seedDocuments.length,
		});

		await db
			.update(noteDigests)
			.set({ status: "scheduled", scheduledFor: now, updatedAt: now })
			.where(eq(noteDigests.id, existing.id));

		digestId = existing.id;
	} else {
		console.log("[noteDigest] Creating seed digest with documents", {
			userId,
			documentCount: seedDocuments.length,
		});

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

		digestId = digest.id;
	}

	await db.insert(noteDigestItems).values(
		seedDocuments.map((doc, index) => ({
			noteDigestId: digestId,
			documentId: doc.id,
			position: index + 1,
			contentHashAtSend: doc.contentHash,
		})),
	);

	console.log("[noteDigest] Seed digest created successfully", {
		userId,
		digestId,
		itemCount: seedDocuments.length,
	});

	return { created: true, digestId, itemCount: seedDocuments.length };
}
