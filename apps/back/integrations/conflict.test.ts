import { describe, expect, it } from "bun:test";
import { resolveDeleteDecision, resolveUpsertDecision } from "./sync-decisions";

describe("resolveUpsertDecision", () => {
	const baseUpsert = {
		op: "upsert",
		externalId: "doc-1",
		title: "Doc",
		contentMarkdown: "hello",
		contentHash: "hash-a",
		updatedAtSource: "2024-01-01T00:00:00.000Z",
		deletedAtSource: null,
		metadata: null,
	} as const;

	it("applies when there is no existing document", () => {
		const decision = resolveUpsertDecision(null, baseUpsert, new Date());
		expect(decision.action).toBe("apply");
	});

	it("skips when incoming is older than existing", () => {
		const existing = {
			contentHash: "hash-b",
			updatedAtSource: new Date("2024-01-02T00:00:00.000Z"),
			deletedAtSource: null,
		};

		const decision = resolveUpsertDecision(
			existing,
			{ ...baseUpsert, updatedAtSource: "2024-01-01T00:00:00.000Z" },
			new Date("2024-01-03T00:00:00.000Z"),
		);

		expect(decision.action).toBe("skip");
		expect(decision.reason).toBe("stale_source_timestamp");
	});

	it("skips unchanged content at the same timestamp", () => {
		const existing = {
			contentHash: "hash-a",
			updatedAtSource: new Date("2024-01-01T00:00:00.000Z"),
			deletedAtSource: null,
		};

		const decision = resolveUpsertDecision(existing, baseUpsert, new Date("2024-01-01T00:00:00.000Z"));

		expect(decision.action).toBe("skip");
		expect(decision.reason).toBe("unchanged");
	});
});

describe("resolveDeleteDecision", () => {
	const baseDelete = {
		op: "delete",
		externalId: "doc-1",
		deletedAtSource: "2024-01-02T00:00:00.000Z",
		updatedAtSource: null,
		metadata: null,
	} as const;

	it("applies when delete is newer than existing", () => {
		const existing = {
			contentHash: "hash-a",
			updatedAtSource: new Date("2024-01-01T00:00:00.000Z"),
			deletedAtSource: null,
		};

		const decision = resolveDeleteDecision(existing, baseDelete, new Date("2024-01-03T00:00:00.000Z"));

		expect(decision.action).toBe("apply");
	});

	it("skips when delete is older than existing", () => {
		const existing = {
			contentHash: "hash-a",
			updatedAtSource: new Date("2024-01-03T00:00:00.000Z"),
			deletedAtSource: null,
		};

		const decision = resolveDeleteDecision(existing, baseDelete, new Date("2024-01-04T00:00:00.000Z"));

		expect(decision.action).toBe("skip");
		expect(decision.reason).toBe("stale_source_timestamp");
	});

	it("marks a tombstone when the document is missing", () => {
		const decision = resolveDeleteDecision(null, baseDelete, new Date("2024-01-03T00:00:00.000Z"));

		expect(decision.action).toBe("apply");
		expect(decision.tombstone).toBe(true);
	});
});
