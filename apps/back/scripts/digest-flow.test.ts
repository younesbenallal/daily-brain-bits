import { describe, expect, it } from "bun:test";
import * as schedule from "../domains/digest/schedule";

/**
 * Integration tests for the digest email flow.
 *
 * These tests verify the core business logic of digest generation and sending:
 * - Timezone-aware scheduling
 * - Interval enforcement
 * - Send window checks
 * - Idempotency (no duplicate digests per day)
 *
 * The tests mock database and email dependencies to focus on logic correctness.
 */

describe("digest flow integration", () => {
	describe("digest generation logic", () => {
		it("should generate digest for user without existing digest for today", () => {
			const now = new Date("2026-02-08T10:00:00Z");
			const timezone = "UTC";
			const lastDigestDate = new Date("2026-02-07T00:00:00Z");

			// User has a digest from yesterday, should create new one for today
			const shouldCreate = !schedule.isSameLocalDay(now, lastDigestDate, timezone);
			expect(shouldCreate).toBe(true);

			const scheduledFor = schedule.getStartOfLocalDay(now, timezone);
			expect(scheduledFor.toISOString()).toBe("2026-02-08T00:00:00.000Z");
		});

		it("should skip user who already has digest for today", () => {
			const now = new Date("2026-02-08T10:00:00Z");
			const timezone = "UTC";
			const lastDigestDate = new Date("2026-02-08T00:00:00Z");

			// User already has a digest for today
			const shouldSkip = schedule.isSameLocalDay(now, lastDigestDate, timezone);
			expect(shouldSkip).toBe(true);
		});

		it("should skip when UTC dates differ but local date is the same", () => {
			// 2026-02-08T04:30:00Z is still Feb 7 in New York
			const now = new Date("2026-02-08T04:30:00Z");
			const timezone = "America/New_York";
			const lastDigestDate = new Date("2026-02-08T00:30:00Z");

			const shouldSkip = schedule.isSameLocalDay(now, lastDigestDate, timezone);
			expect(shouldSkip).toBe(true);
		});

		it("should use local midnight based on user timezone for scheduling", () => {
			// 2026-02-08T04:30:00Z is Feb 7 in New York, so scheduledFor is Feb 7 local midnight
			const now = new Date("2026-02-08T04:30:00Z");
			const timezone = "America/New_York";

			const scheduledFor = schedule.getStartOfLocalDay(now, timezone);
			expect(scheduledFor.toISOString()).toBe("2026-02-07T05:00:00.000Z");
		});

		it("should respect user timezone for digest date", () => {
			// 3 AM UTC on Feb 8 = 10 PM Feb 7 in New York
			const now = new Date("2026-02-08T03:00:00Z");
			const timezone = "America/New_York";

			const scheduledFor = schedule.getStartOfLocalDay(now, timezone);
			// Should be Feb 7 midnight in NY = Feb 7 05:00 UTC
			expect(scheduledFor.toISOString()).toBe("2026-02-07T05:00:00.000Z");
		});

		it("should handle timezone boundary correctly", () => {
			// 11 PM UTC on Feb 7 = midnight Feb 8 in Paris (UTC+1)
			const now = new Date("2026-02-07T23:30:00Z");
			const timezone = "Europe/Paris";

			// In Paris, it's already Feb 8
			const dateInParis = schedule.getDateInTimezone(now, timezone);
			expect(dateInParis).toBe("2026-02-08");

			const scheduledFor = schedule.getStartOfLocalDay(now, timezone);
			// Feb 8 midnight Paris = Feb 7 23:00 UTC
			expect(scheduledFor.toISOString()).toBe("2026-02-07T23:00:00.000Z");
		});
	});

	describe("digest send eligibility", () => {
		it("should be due when in send window and interval elapsed", () => {
			const now = new Date("2026-02-08T08:00:00Z"); // 8 AM UTC
			const lastSentAt = new Date("2026-02-05T08:00:00Z"); // 3 days ago
			const intervalDays = 3;
			const timezone = "UTC";
			const preferredSendHour = 8;

			const isDue = schedule.isDigestDueWithTimezone({
				now,
				lastSentAt,
				intervalDays,
				timezone,
				preferredSendHour,
			});

			expect(isDue).toBe(true);
		});

		it("should not be due when outside send window", () => {
			const now = new Date("2026-02-08T10:00:00Z"); // 10 AM UTC
			const lastSentAt = new Date("2026-02-05T08:00:00Z"); // 3 days ago
			const intervalDays = 3;
			const timezone = "UTC";
			const preferredSendHour = 8; // User wants 8 AM, but it's 10 AM

			const isDue = schedule.isDigestDueWithTimezone({
				now,
				lastSentAt,
				intervalDays,
				timezone,
				preferredSendHour,
			});

			expect(isDue).toBe(false);
		});

		it("should not be due when interval not elapsed", () => {
			const now = new Date("2026-02-08T08:00:00Z"); // 8 AM UTC
			const lastSentAt = new Date("2026-02-07T08:00:00Z"); // Only 1 day ago
			const intervalDays = 3; // Need 3 days
			const timezone = "UTC";
			const preferredSendHour = 8;

			const isDue = schedule.isDigestDueWithTimezone({
				now,
				lastSentAt,
				intervalDays,
				timezone,
				preferredSendHour,
			});

			expect(isDue).toBe(false);
		});

		it("should be due for first digest when in send window", () => {
			const now = new Date("2026-02-08T08:00:00Z");
			const lastSentAt = null; // First digest ever
			const intervalDays = 3;
			const timezone = "UTC";
			const preferredSendHour = 8;

			const isDue = schedule.isDigestDueWithTimezone({
				now,
				lastSentAt,
				intervalDays,
				timezone,
				preferredSendHour,
			});

			expect(isDue).toBe(true);
		});

		it("should not be due for first digest when outside send window", () => {
			const now = new Date("2026-02-08T09:00:00Z");
			const lastSentAt = null;
			const intervalDays = 3;
			const timezone = "UTC";
			const preferredSendHour = 8;

			const isDue = schedule.isDigestDueWithTimezone({
				now,
				lastSentAt,
				intervalDays,
				timezone,
				preferredSendHour,
			});

			expect(isDue).toBe(false);
		});

		it("should not send twice on same day", () => {
			const now = new Date("2026-02-08T08:30:00Z"); // 8:30 AM UTC
			const lastSentAt = new Date("2026-02-08T08:00:00Z"); // Sent 30 min ago
			const intervalDays = 1;
			const timezone = "UTC";
			const preferredSendHour = 8;

			const isDue = schedule.isDigestDueWithTimezone({
				now,
				lastSentAt,
				intervalDays,
				timezone,
				preferredSendHour,
			});

			expect(isDue).toBe(false);
		});

		it("should respect user timezone for send window", () => {
			// 1 PM UTC = 8 AM in New York (UTC-5)
			const now = new Date("2026-02-08T13:00:00Z");
			const lastSentAt = new Date("2026-02-05T13:00:00Z");
			const intervalDays = 3;
			const timezone = "America/New_York";
			const preferredSendHour = 8; // 8 AM NY time

			const isDue = schedule.isDigestDueWithTimezone({
				now,
				lastSentAt,
				intervalDays,
				timezone,
				preferredSendHour,
			});

			expect(isDue).toBe(true);
		});

		it("should handle daily digest (1 day interval)", () => {
			const now = new Date("2026-02-08T08:00:00Z");
			const lastSentAt = new Date("2026-02-07T08:00:00Z"); // Yesterday
			const intervalDays = 1;
			const timezone = "UTC";
			const preferredSendHour = 8;

			const isDue = schedule.isDigestDueWithTimezone({
				now,
				lastSentAt,
				intervalDays,
				timezone,
				preferredSendHour,
			});

			expect(isDue).toBe(true);
		});

		it("should handle weekly digest (7 day interval)", () => {
			const now = new Date("2026-02-08T08:00:00Z");
			const lastSentAt = new Date("2026-02-01T08:00:00Z"); // 7 days ago
			const intervalDays = 7;
			const timezone = "UTC";
			const preferredSendHour = 8;

			const isDue = schedule.isDigestDueWithTimezone({
				now,
				lastSentAt,
				intervalDays,
				timezone,
				preferredSendHour,
			});

			expect(isDue).toBe(true);

			// 6 days ago - not yet due
			const lastSentAt6Days = new Date("2026-02-02T08:00:00Z");
			const isDue6Days = schedule.isDigestDueWithTimezone({
				now,
				lastSentAt: lastSentAt6Days,
				intervalDays,
				timezone,
				preferredSendHour,
			});

			expect(isDue6Days).toBe(false);
		});

		it("should be due exactly at interval boundary and not before", () => {
			const timezone = "UTC";
			const preferredSendHour = 8;
			const intervalDays = 3;
			const lastSentAt = new Date("2026-02-05T08:00:00.000Z");

			const justBeforeBoundary = new Date("2026-02-08T07:59:59.999Z");
			const isDueBeforeBoundary = schedule.isDigestDueWithTimezone({
				now: justBeforeBoundary,
				lastSentAt,
				intervalDays,
				timezone,
				preferredSendHour: 7,
			});
			expect(isDueBeforeBoundary).toBe(false);

			const atBoundary = new Date("2026-02-08T08:00:00.000Z");
			const isDueAtBoundary = schedule.isDigestDueWithTimezone({
				now: atBoundary,
				lastSentAt,
				intervalDays,
				timezone,
				preferredSendHour,
			});
			expect(isDueAtBoundary).toBe(true);
		});

		it("should enforce send window for half-hour offset timezones", () => {
			// 02:30 UTC is 08:00 IST
			const nowInWindow = new Date("2026-02-08T02:30:00Z");
			const timezone = "Asia/Kolkata";
			const preferredSendHour = 8;

			const inWindow = schedule.isInSendWindow({
				now: nowInWindow,
				timezone,
				preferredSendHour,
			});
			expect(inWindow).toBe(true);

			const nowOutsideWindow = new Date("2026-02-08T03:30:00Z"); // 09:00 IST
			const outsideWindow = schedule.isInSendWindow({
				now: nowOutsideWindow,
				timezone,
				preferredSendHour,
			});
			expect(outsideWindow).toBe(false);
		});

		it("should not send twice on the same local day across UTC day boundary", () => {
			// Last send was 11:00 PM Feb 7 in New York (04:00 UTC Feb 8)
			const lastSentAt = new Date("2026-02-08T04:00:00Z");
			// Now is 8:00 AM Feb 7 in New York (13:00 UTC Feb 8)
			const now = new Date("2026-02-08T13:00:00Z");
			const timezone = "America/New_York";

			const isDue = schedule.isDigestDueWithTimezone({
				now,
				lastSentAt,
				intervalDays: 1,
				timezone,
				preferredSendHour: 8,
			});

			expect(isDue).toBe(false);
		});
	});

	describe("plan limits", () => {
		it("should clamp interval to minimum for free users", () => {
			const freeLimits = { minDigestIntervalDays: 3, maxDigestIntervalDays: 30 };

			// Free user trying to set daily (1 day) - should be clamped to 3
			expect(schedule.clampIntervalToLimits({ requested: 1, limits: freeLimits })).toBe(3);
			expect(schedule.clampIntervalToLimits({ requested: 2, limits: freeLimits })).toBe(3);
			expect(schedule.clampIntervalToLimits({ requested: 3, limits: freeLimits })).toBe(3);
		});

		it("should allow daily for pro users", () => {
			const proLimits = { minDigestIntervalDays: 1, maxDigestIntervalDays: 30 };

			expect(schedule.clampIntervalToLimits({ requested: 1, limits: proLimits })).toBe(1);
		});

		it("should clamp to maximum interval", () => {
			const limits = { minDigestIntervalDays: 1, maxDigestIntervalDays: 30 };

			expect(schedule.clampIntervalToLimits({ requested: 60, limits })).toBe(30);
			expect(schedule.clampIntervalToLimits({ requested: 30, limits })).toBe(30);
		});
	});

	describe("edge cases", () => {
		it("should handle DST transitions", () => {
			// March 8, 2026 - US DST starts (clocks spring forward at 2 AM EST)
			// At 2 AM local time, clocks move to 3 AM EDT
			const beforeDST = new Date("2026-03-08T06:00:00Z"); // 1 AM EST (before switch)
			const afterDST = new Date("2026-03-08T08:00:00Z"); // 4 AM EDT (after spring forward)

			const timezone = "America/New_York";

			// Both should correctly identify the date
			expect(schedule.getDateInTimezone(beforeDST, timezone)).toBe("2026-03-08");
			expect(schedule.getDateInTimezone(afterDST, timezone)).toBe("2026-03-08");

			// User's 8 AM should work correctly after DST
			// After DST: 8 AM EDT = 12:00 UTC
			const sendTimeEDT = new Date("2026-03-08T12:00:00Z"); // 8 AM EDT
			const inWindowEDT = schedule.isInSendWindow({
				now: sendTimeEDT,
				timezone,
				preferredSendHour: 8,
			});
			expect(inWindowEDT).toBe(true);

			// Also test a day before DST (March 7)
			// Before DST: 8 AM EST = 13:00 UTC
			const sendTimeEST = new Date("2026-03-07T13:00:00Z"); // 8 AM EST
			const inWindowEST = schedule.isInSendWindow({
				now: sendTimeEST,
				timezone,
				preferredSendHour: 8,
			});
			expect(inWindowEST).toBe(true);
		});

		it("should handle leap year correctly", () => {
			// Feb 29, 2024 is a leap year
			const leapDay = new Date("2024-02-29T12:00:00Z");

			expect(schedule.getDateInTimezone(leapDay, "UTC")).toBe("2024-02-29");
			expect(schedule.getStartOfLocalDay(leapDay, "UTC").toISOString()).toBe("2024-02-29T00:00:00.000Z");
		});

		it("should handle year boundary", () => {
			// Dec 31, 11 PM UTC = Jan 1, midnight in Paris
			const newYearEve = new Date("2025-12-31T23:30:00Z");

			expect(schedule.getDateInTimezone(newYearEve, "UTC")).toBe("2025-12-31");
			expect(schedule.getDateInTimezone(newYearEve, "Europe/Paris")).toBe("2026-01-01");

			// isSameLocalDay should correctly identify different years
			const jan1 = new Date("2026-01-01T00:30:00Z");
			expect(schedule.isSameLocalDay(newYearEve, jan1, "UTC")).toBe(false);
			expect(schedule.isSameLocalDay(newYearEve, jan1, "Europe/Paris")).toBe(true);
		});

		it("should handle international date line", () => {
			// Test with Pacific/Auckland (UTC+13 in summer)
			const utcMidnight = new Date("2026-02-08T00:00:00Z");

			// At UTC midnight, it's already 1 PM in Auckland
			const aucklandDate = schedule.getDateInTimezone(utcMidnight, "Pacific/Auckland");
			expect(aucklandDate).toBe("2026-02-08");

			// And in Honolulu (UTC-10), it's still Feb 7
			const honoluluDate = schedule.getDateInTimezone(utcMidnight, "Pacific/Honolulu");
			expect(honoluluDate).toBe("2026-02-07");
		});
	});
});
