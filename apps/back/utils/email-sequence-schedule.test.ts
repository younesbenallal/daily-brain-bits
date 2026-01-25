import { describe, expect, test } from "bun:test";
import { getSequenceStepDueAt, isSequenceStepDue } from "./email-sequence-schedule";

describe("email-sequence-schedule", () => {
	test("calculates welcome step due dates from entry time", () => {
		const enteredAt = new Date("2026-01-01T12:00:00Z");
		const stepTwo = getSequenceStepDueAt({ sequenceName: "welcome", step: 2, enteredAt });
		expect(stepTwo?.toISOString()).toBe("2026-01-03T12:00:00.000Z");
	});

	test("requires first digest for onboarding step 3", () => {
		const enteredAt = new Date("2026-01-01T12:00:00Z");
		const stepThreeWithoutDigest = getSequenceStepDueAt({
			sequenceName: "onboarding",
			step: 3,
			enteredAt,
			firstDigestSentAt: null,
		});
		expect(stepThreeWithoutDigest).toBeNull();

		const firstDigestSentAt = new Date("2026-01-02T10:00:00Z");
		const stepThree = getSequenceStepDueAt({
			sequenceName: "onboarding",
			step: 3,
			enteredAt,
			firstDigestSentAt,
		});
		expect(stepThree?.toISOString()).toBe("2026-01-02T12:00:00.000Z");
	});

	test("isSequenceStepDue returns false before due time", () => {
		const enteredAt = new Date("2026-01-01T12:00:00Z");
		const now = new Date("2026-01-02T11:59:00Z");
		const due = isSequenceStepDue({ now, sequenceName: "welcome", step: 2, enteredAt });
		expect(due).toBe(false);
	});
});
