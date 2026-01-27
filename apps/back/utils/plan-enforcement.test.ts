import { describe, expect, it } from "bun:test";
import { evaluateNoteLimit, evaluateSourceLimit } from "./plan-enforcement-utils";

describe("plan-enforcement", () => {
	it("allows when note limit has room", () => {
		const result = evaluateNoteLimit({ currentCount: 100, newNoteCount: 10, limit: 200 });
		expect(result.allowed).toBe(true);
		expect(result.overflow).toBe(0);
	});

	it("blocks when note limit would overflow", () => {
		const result = evaluateNoteLimit({ currentCount: 195, newNoteCount: 10, limit: 200 });
		expect(result.allowed).toBe(false);
		expect(result.overflow).toBe(5);
	});

	it("allows when note limit is unlimited", () => {
		const result = evaluateNoteLimit({ currentCount: 1000, newNoteCount: 500, limit: Number.POSITIVE_INFINITY });
		expect(result.allowed).toBe(true);
		expect(result.overflow).toBe(0);
	});

	it("blocks when source limit is reached", () => {
		const result = evaluateSourceLimit({ currentCount: 1, limit: 1 });
		expect(result.allowed).toBe(false);
	});

	it("allows when source limit is unlimited", () => {
		const result = evaluateSourceLimit({ currentCount: 100, limit: Number.POSITIVE_INFINITY });
		expect(result.allowed).toBe(true);
	});
});
