import { describe, expect, it } from "bun:test";
import { generateNoteDigest, type ReviewCandidate } from "./note-digest";

const NOW = new Date("2024-01-10T00:00:00.000Z");

const baseCandidate = (overrides: Partial<ReviewCandidate>): ReviewCandidate => ({
	documentId: overrides.documentId ?? 1,
	status: overrides.status ?? "reviewing",
	nextDueAt: overrides.nextDueAt ?? null,
	lastSentAt: overrides.lastSentAt ?? null,
	priorityWeight: overrides.priorityWeight ?? 1,
	deprioritizedUntil: overrides.deprioritizedUntil ?? null,
});

describe("generateNoteDigest", () => {
	it("skips suspended and deprioritized items", () => {
		const candidates: ReviewCandidate[] = [
			baseCandidate({ documentId: 1, status: "suspended" }),
			baseCandidate({ documentId: 2, deprioritizedUntil: new Date("2024-01-11T00:00:00.000Z") }),
			baseCandidate({ documentId: 3, nextDueAt: new Date("2024-01-09T00:00:00.000Z") }),
		];

		const result = generateNoteDigest(candidates, { batchSize: 5, now: NOW });

		expect(result.items.map((item) => item.documentId)).toEqual([3]);
		expect(result.skipped).toEqual([
			{ documentId: 1, reason: "suspended" },
			{ documentId: 2, reason: "deprioritized" },
		]);
	});

	it("prioritizes overdue and due soon before new content", () => {
		const candidates: ReviewCandidate[] = [
			baseCandidate({ documentId: 1, nextDueAt: new Date("2024-01-08T00:00:00.000Z") }),
			baseCandidate({ documentId: 2, nextDueAt: new Date("2024-01-12T00:00:00.000Z") }),
			baseCandidate({ documentId: 3, nextDueAt: new Date("2024-01-20T00:00:00.000Z") }),
			baseCandidate({ documentId: 4, nextDueAt: null }),
		];

		const result = generateNoteDigest(candidates, { batchSize: 2, now: NOW, dueSoonDays: 3 });

		expect(result.items.map((item) => item.documentId)).toEqual([1, 2]);
		expect(result.items.map((item) => item.reason)).toEqual(["overdue", "due_soon"]);
	});

	it("caps new items when scheduled content is available", () => {
		const candidates: ReviewCandidate[] = [
			baseCandidate({ documentId: 1, nextDueAt: new Date("2024-01-09T00:00:00.000Z") }),
			baseCandidate({ documentId: 2, nextDueAt: null }),
			baseCandidate({ documentId: 3, nextDueAt: null }),
			baseCandidate({ documentId: 4, nextDueAt: null }),
			baseCandidate({ documentId: 5, nextDueAt: new Date("2024-02-01T00:00:00.000Z") }),
			baseCandidate({ documentId: 6, nextDueAt: new Date("2024-02-05T00:00:00.000Z") }),
		];

		const result = generateNoteDigest(candidates, { batchSize: 4, now: NOW, maxNewFraction: 0.25 });

		const ids = result.items.map((item) => item.documentId);
		expect(ids).toEqual([1, 2, 5, 6]);
		expect(result.items.filter((item) => item.reason === "new").length).toBe(1);
	});

	it("fills with new content when scheduled items are exhausted", () => {
		const candidates: ReviewCandidate[] = [
			baseCandidate({ documentId: 1, nextDueAt: new Date("2024-01-09T00:00:00.000Z") }),
			baseCandidate({ documentId: 2, nextDueAt: null }),
			baseCandidate({ documentId: 3, nextDueAt: null }),
			baseCandidate({ documentId: 4, nextDueAt: null }),
		];

		const result = generateNoteDigest(candidates, { batchSize: 4, now: NOW, maxNewFraction: 0.25 });

		expect(result.items.map((item) => item.documentId)).toEqual([1, 2, 3, 4]);
	});

	it("boosts items with higher priority weight", () => {
		const candidates: ReviewCandidate[] = [
			baseCandidate({ documentId: 1, nextDueAt: new Date("2024-01-15T00:00:00.000Z"), priorityWeight: 0.5 }),
			baseCandidate({ documentId: 2, nextDueAt: new Date("2024-01-15T00:00:00.000Z"), priorityWeight: 3 }),
		];

		const result = generateNoteDigest(candidates, { batchSize: 1, now: NOW });

		expect(result.items[0]?.documentId).toBe(2);
	});

	it("applies cooldown to recent sends", () => {
		const candidates: ReviewCandidate[] = [
			baseCandidate({ documentId: 1, nextDueAt: new Date("2024-01-09T00:00:00.000Z"), lastSentAt: new Date("2024-01-09T12:00:00.000Z") }),
			baseCandidate({ documentId: 2, nextDueAt: new Date("2024-01-09T00:00:00.000Z"), lastSentAt: new Date("2024-01-01T00:00:00.000Z") }),
		];

		const result = generateNoteDigest(candidates, { batchSize: 1, now: NOW, minSendIntervalDays: 2 });

		expect(result.items[0]?.documentId).toBe(2);
		expect(result.items[0]?.cooldownApplied).toBe(false);
	});

	it("keeps stable ordering on ties by documentId", () => {
		const candidates: ReviewCandidate[] = [
			baseCandidate({ documentId: 2, nextDueAt: new Date("2024-01-11T00:00:00.000Z"), priorityWeight: 1 }),
			baseCandidate({ documentId: 1, nextDueAt: new Date("2024-01-11T00:00:00.000Z"), priorityWeight: 1 }),
		];

		const result = generateNoteDigest(candidates, { batchSize: 2, now: NOW });

		expect(result.items.map((item) => item.documentId)).toEqual([1, 2]);
	});

	it("returns empty batch when size is zero", () => {
		const candidates: ReviewCandidate[] = [baseCandidate({ documentId: 1 })];
		const result = generateNoteDigest(candidates, { batchSize: 0, now: NOW });

		expect(result.items).toEqual([]);
		expect(result.skipped).toEqual([]);
	});
});
