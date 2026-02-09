import type { syncItemDeleteSchema, syncItemUpsertSchema } from "@daily-brain-bits/core";
import type { z } from "zod";

type ExistingDocumentSnapshot = {
	contentHash: string;
	updatedAtSource: Date | null;
	deletedAtSource: Date | null;
};

type SyncItemUpsert = z.infer<typeof syncItemUpsertSchema>;
type SyncItemDelete = z.infer<typeof syncItemDeleteSchema>;

type Decision = {
	action: "apply" | "skip";
	reason?: "stale_source_timestamp" | "unchanged";
};

type DeleteDecision = Decision & {
	tombstone?: boolean;
};

function parseDateOrNull(value?: string | null): Date | null {
	if (!value) {
		return null;
	}
	const parsed = new Date(value);
	return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function resolveSourceTimeMs(value: string | null | undefined, receivedAt: Date): number {
	const parsed = parseDateOrNull(value);
	return parsed ? parsed.getTime() : receivedAt.getTime();
}

function getExistingSourceTimeMs(existing: ExistingDocumentSnapshot): number | null {
	const updatedMs = existing.updatedAtSource?.getTime() ?? null;
	const deletedMs = existing.deletedAtSource?.getTime() ?? null;
	if (updatedMs === null && deletedMs === null) {
		return null;
	}
	return Math.max(updatedMs ?? 0, deletedMs ?? 0);
}

export function resolveUpsertDecision(existing: ExistingDocumentSnapshot | null, upsert: SyncItemUpsert, receivedAt: Date): Decision {
	if (!existing) {
		return { action: "apply" };
	}

	const incomingMs = resolveSourceTimeMs(upsert.updatedAtSource ?? null, receivedAt);
	const existingMs = getExistingSourceTimeMs(existing);

	if (existingMs !== null && incomingMs < existingMs) {
		return { action: "skip", reason: "stale_source_timestamp" };
	}

	if (existingMs !== null && incomingMs === existingMs) {
		if (existing.deletedAtSource) {
			return { action: "skip", reason: "stale_source_timestamp" };
		}
		if (existing.contentHash === upsert.contentHash) {
			return { action: "skip", reason: "unchanged" };
		}
	}

	return { action: "apply" };
}

export function resolveDeleteDecision(existing: ExistingDocumentSnapshot | null, deleted: SyncItemDelete, receivedAt: Date): DeleteDecision {
	if (!existing) {
		return { action: "apply", tombstone: true };
	}

	const incomingMs = resolveSourceTimeMs(deleted.deletedAtSource, receivedAt);
	const existingMs = getExistingSourceTimeMs(existing);

	if (existingMs !== null && incomingMs <= existingMs) {
		return { action: "skip", reason: "stale_source_timestamp" };
	}

	return { action: "apply" };
}

