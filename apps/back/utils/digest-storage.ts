import { db, noteDigestItems, noteDigests } from "@daily-brain-bits/db";
import { eq } from "drizzle-orm";

type DigestItemInsert = {
	documentId: number;
	position: number;
	contentHashAtSend: string;
};

export async function upsertDigestWithItems(params: {
	userId: string;
	digestId?: number | null;
	items: DigestItemInsert[] | null;
	status: "scheduled" | "sent" | "failed" | "skipped";
	scheduledFor?: Date | null;
	sentAt?: Date | null;
	payloadJson?: unknown | null;
	errorJson?: unknown | null;
}): Promise<number | null> {
	const now = new Date();
	let digestId = params.digestId ?? null;

	await db.transaction(async (tx) => {
		if (digestId) {
			if (params.items) {
				await tx.delete(noteDigestItems).where(eq(noteDigestItems.noteDigestId, digestId));
			}
			await tx
				.update(noteDigests)
				.set({
					scheduledFor: params.scheduledFor ?? null,
					sentAt: params.sentAt ?? null,
					status: params.status,
					payloadJson: params.payloadJson ?? null,
					errorJson: params.errorJson ?? null,
					updatedAt: now,
				})
				.where(eq(noteDigests.id, digestId));
		} else {
			const [digest] = await tx
				.insert(noteDigests)
				.values({
					userId: params.userId,
					scheduledFor: params.scheduledFor ?? null,
					sentAt: params.sentAt ?? null,
					status: params.status,
					payloadJson: params.payloadJson ?? null,
					errorJson: params.errorJson ?? null,
				})
				.returning({ id: noteDigests.id });
			digestId = digest?.id ?? null;
		}

		if (digestId && params.items) {
			if (params.items.length > 0) {
				await tx.insert(noteDigestItems).values(
					params.items.map((item) => ({
						noteDigestId: digestId as number,
						...item,
					})),
				);
			}
		}
	});

	return digestId;
}
