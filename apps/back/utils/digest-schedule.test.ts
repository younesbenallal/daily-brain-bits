import { describe, expect, it } from "bun:test";
import { clampIntervalToLimits, getIntervalMs, getStartOfLocalDay, isDigestDue } from "../domains/digest/schedule";

describe("digest-schedule", () => {
	it("defaults to due when no previous send exists", () => {
		const now = new Date("2024-01-10T10:00:00Z");
		expect(isDigestDue({ now, lastSentAt: null, intervalDays: 1 })).toBe(true);
	});

	it("respects daily interval (1 day)", () => {
		const lastSentAt = new Date("2024-01-10T10:00:00Z");
		const now = new Date("2024-01-11T09:59:00Z");
		expect(isDigestDue({ now, lastSentAt, intervalDays: 1 })).toBe(false);

		const afterInterval = new Date("2024-01-11T10:01:00Z");
		expect(isDigestDue({ now: afterInterval, lastSentAt, intervalDays: 1 })).toBe(true);
	});

	it("respects weekly interval (7 days)", () => {
		const lastSentAt = new Date("2024-01-10T10:00:00Z");
		const sixDaysLater = new Date("2024-01-16T10:00:00Z");
		expect(isDigestDue({ now: sixDaysLater, lastSentAt, intervalDays: 7 })).toBe(false);

		const sevenDaysLater = new Date("2024-01-17T10:00:00Z");
		expect(isDigestDue({ now: sevenDaysLater, lastSentAt, intervalDays: 7 })).toBe(true);
	});

	it("respects custom interval (3 days)", () => {
		const lastSentAt = new Date("2024-01-10T10:00:00Z");
		const twoDaysLater = new Date("2024-01-12T10:00:00Z");
		expect(isDigestDue({ now: twoDaysLater, lastSentAt, intervalDays: 3 })).toBe(false);

		const threeDaysLater = new Date("2024-01-13T10:00:00Z");
		expect(isDigestDue({ now: threeDaysLater, lastSentAt, intervalDays: 3 })).toBe(true);
	});

	it("clamps interval to plan limits", () => {
		const freeLimits = { minDigestIntervalDays: 3, maxDigestIntervalDays: 30 };
		const proLimits = { minDigestIntervalDays: 1, maxDigestIntervalDays: 30 };

		// Free user trying to set daily
		expect(clampIntervalToLimits({ requested: 1, limits: freeLimits })).toBe(3);

		// Free user setting within range
		expect(clampIntervalToLimits({ requested: 7, limits: freeLimits })).toBe(7);

		// Pro user can set daily
		expect(clampIntervalToLimits({ requested: 1, limits: proLimits })).toBe(1);

		// Both users clamped to max
		expect(clampIntervalToLimits({ requested: 60, limits: freeLimits })).toBe(30);
	});

	it("returns interval in milliseconds", () => {
		const dayMs = 24 * 60 * 60 * 1000;
		expect(getIntervalMs(1)).toBe(dayMs);
		expect(getIntervalMs(7)).toBe(7 * dayMs);
		expect(getIntervalMs(30)).toBe(30 * dayMs);
	});

	it("prevents same-day sends", () => {
		const now = new Date("2024-01-12T18:00:00Z");
		const lastSentAt = new Date("2024-01-12T08:00:00Z");
		expect(isDigestDue({ now, lastSentAt, intervalDays: 1 })).toBe(false);

		const nextDay = new Date("2024-01-13T18:00:00Z");
		expect(isDigestDue({ now: nextDay, lastSentAt, intervalDays: 1 })).toBe(true);
	});

	it("returns local midnight in UTC for a timezone", () => {
		const now = new Date("2024-01-15T18:00:00Z");
		const midnight = getStartOfLocalDay(now, "America/Los_Angeles");
		expect(midnight.toISOString()).toBe("2024-01-15T08:00:00.000Z");
	});
});
