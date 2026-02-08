import { describe, expect, it } from "bun:test";
import {
	clampIntervalToLimits,
	getDateInTimezone,
	getIntervalMs,
	getStartOfLocalDay,
	isDigestDue,
	isSameLocalDay,
} from "../domains/digest/schedule";

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

describe("getStartOfLocalDay", () => {
	it("returns midnight UTC for UTC timezone", () => {
		const date = new Date("2026-02-08T08:01:03Z");
		const result = getStartOfLocalDay(date, "UTC");
		expect(result.toISOString()).toBe("2026-02-08T00:00:00.000Z");
	});

	it("returns same day midnight for UTC timezone at various times", () => {
		// Early morning
		expect(getStartOfLocalDay(new Date("2026-02-08T00:04:28Z"), "UTC").toISOString()).toBe("2026-02-08T00:00:00.000Z");
		// Noon
		expect(getStartOfLocalDay(new Date("2026-02-08T12:00:00Z"), "UTC").toISOString()).toBe("2026-02-08T00:00:00.000Z");
		// Late night
		expect(getStartOfLocalDay(new Date("2026-02-08T23:59:59Z"), "UTC").toISOString()).toBe("2026-02-08T00:00:00.000Z");
	});

	it("handles midnight boundary correctly for UTC", () => {
		// Just before midnight
		expect(getStartOfLocalDay(new Date("2026-02-07T23:59:59Z"), "UTC").toISOString()).toBe("2026-02-07T00:00:00.000Z");
		// Exactly at midnight
		expect(getStartOfLocalDay(new Date("2026-02-08T00:00:00Z"), "UTC").toISOString()).toBe("2026-02-08T00:00:00.000Z");
		// Just after midnight
		expect(getStartOfLocalDay(new Date("2026-02-08T00:00:01Z"), "UTC").toISOString()).toBe("2026-02-08T00:00:00.000Z");
	});

	it("handles Europe/Paris timezone (UTC+1 in winter)", () => {
		// Feb 8 at 00:30 UTC = Feb 8 at 01:30 Paris
		expect(getStartOfLocalDay(new Date("2026-02-08T00:30:00Z"), "Europe/Paris").toISOString()).toBe(
			"2026-02-07T23:00:00.000Z",
		);
	});

	it("handles America/New_York timezone (UTC-5 in winter)", () => {
		// Feb 8 at 03:00 UTC = Feb 7 at 22:00 NY
		expect(getStartOfLocalDay(new Date("2026-02-08T03:00:00Z"), "America/New_York").toISOString()).toBe(
			"2026-02-07T05:00:00.000Z",
		);
		// Feb 8 at 06:00 UTC = Feb 8 at 01:00 NY
		expect(getStartOfLocalDay(new Date("2026-02-08T06:00:00Z"), "America/New_York").toISOString()).toBe(
			"2026-02-08T05:00:00.000Z",
		);
	});
});

describe("isSameLocalDay", () => {
	it("returns true for same UTC day", () => {
		const a = new Date("2026-02-08T08:00:00Z");
		const b = new Date("2026-02-08T20:00:00Z");
		expect(isSameLocalDay(a, b, "UTC")).toBe(true);
	});

	it("returns false for different UTC days", () => {
		const a = new Date("2026-02-08T08:00:00Z");
		const b = new Date("2026-02-07T08:00:00Z");
		expect(isSameLocalDay(a, b, "UTC")).toBe(false);
	});

	it("handles timezone boundaries correctly", () => {
		// Feb 8 00:30 UTC and Feb 7 23:30 UTC
		// In UTC: different days
		expect(isSameLocalDay(new Date("2026-02-08T00:30:00Z"), new Date("2026-02-07T23:30:00Z"), "UTC")).toBe(false);
		// In Europe/Paris (UTC+1): both are Feb 8
		expect(isSameLocalDay(new Date("2026-02-08T00:30:00Z"), new Date("2026-02-07T23:30:00Z"), "Europe/Paris")).toBe(
			true,
		);
	});
});

describe("getDateInTimezone", () => {
	it("returns correct date string for UTC", () => {
		expect(getDateInTimezone(new Date("2026-02-08T08:00:00Z"), "UTC")).toBe("2026-02-08");
		expect(getDateInTimezone(new Date("2026-02-08T00:00:00Z"), "UTC")).toBe("2026-02-08");
		expect(getDateInTimezone(new Date("2026-02-08T23:59:59Z"), "UTC")).toBe("2026-02-08");
	});

	it("returns previous day for early UTC times in western timezones", () => {
		// Feb 8 03:00 UTC = Feb 7 22:00 in New York
		expect(getDateInTimezone(new Date("2026-02-08T03:00:00Z"), "America/New_York")).toBe("2026-02-07");
	});

	it("returns next day for late UTC times in eastern timezones", () => {
		// Feb 7 23:30 UTC = Feb 8 00:30 in Paris
		expect(getDateInTimezone(new Date("2026-02-07T23:30:00Z"), "Europe/Paris")).toBe("2026-02-08");
	});
});
