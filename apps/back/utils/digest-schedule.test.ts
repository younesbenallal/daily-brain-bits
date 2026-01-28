import { describe, expect, it } from "bun:test";
import { getFrequencyIntervalMs, getStartOfLocalDay, isDigestDue, resolveEffectiveFrequency } from "../domains/digest/schedule";

describe("digest-schedule", () => {
	it("defaults to due when no previous send exists", () => {
		const now = new Date("2024-01-10T10:00:00Z");
		expect(isDigestDue({ now, lastSentAt: null, frequency: "daily", userId: "user-1" })).toBe(true);
	});

	it("respects daily interval", () => {
		const lastSentAt = new Date("2024-01-10T10:00:00Z");
		const now = new Date("2024-01-11T09:59:00Z");
		expect(isDigestDue({ now, lastSentAt, frequency: "daily", userId: "user-2" })).toBe(false);
	});

	it("respects weekly interval", () => {
		const userId = "user-3";
		const assignedDay = getWeeklySendDayForTest(userId);
		const base = new Date("2024-01-07T10:00:00Z");
		const now = new Date(base.getTime() + assignedDay * 24 * 60 * 60 * 1000);
		const lastSentAt = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
		expect(isDigestDue({ now, lastSentAt, frequency: "weekly", userId })).toBe(true);
	});

	it("resolves effective frequency for free users", () => {
		expect(resolveEffectiveFrequency({ requested: "daily", features: { dailyDigest: false } })).toBe("weekly");
		expect(resolveEffectiveFrequency({ requested: "weekly", features: { dailyDigest: false } })).toBe("weekly");
	});

	it("returns monthly interval", () => {
		expect(getFrequencyIntervalMs("monthly")).toBe(30 * 24 * 60 * 60 * 1000);
	});

	it("staggering prevents weekly sends on non-assigned days", () => {
		const userId = "user-weekly-stagger";
		const assignedDay = getWeeklySendDayForTest(userId);
		const base = new Date("2024-01-07T10:00:00Z");
		const matchDay = new Date(base.getTime() + assignedDay * 24 * 60 * 60 * 1000);
		const mismatchDay = new Date(base.getTime() + ((assignedDay + 1) % 7) * 24 * 60 * 60 * 1000);

		expect(isDigestDue({ now: matchDay, lastSentAt: null, frequency: "weekly", userId })).toBe(true);
		expect(isDigestDue({ now: mismatchDay, lastSentAt: null, frequency: "weekly", userId })).toBe(false);
	});

	it("staggering prevents monthly sends on non-assigned dates", () => {
		const userId = "user-monthly-stagger";
		const assignedDate = getMonthlySendDayForTest(userId);
		const matchDay = new Date(`2024-01-${String(assignedDate).padStart(2, "0")}T10:00:00Z`);
		const mismatchDate = assignedDate === 1 ? 2 : 1;
		const mismatchDay = new Date(`2024-01-${String(mismatchDate).padStart(2, "0")}T10:00:00Z`);

		expect(isDigestDue({ now: matchDay, lastSentAt: null, frequency: "monthly", userId })).toBe(true);
		expect(isDigestDue({ now: mismatchDay, lastSentAt: null, frequency: "monthly", userId })).toBe(false);
	});

	it("prevents same-day sends", () => {
		const userId = "same-day-user";
		const now = new Date("2024-01-12T18:00:00Z");
		const lastSentAt = new Date("2024-01-12T08:00:00Z");
		expect(isDigestDue({ now, lastSentAt, frequency: "daily", userId })).toBe(false);
		const nextDay = new Date("2024-01-13T18:00:00Z");
		expect(isDigestDue({ now: nextDay, lastSentAt, frequency: "daily", userId })).toBe(true);
	});

	it("returns local midnight in UTC for a timezone", () => {
		const now = new Date("2024-01-15T18:00:00Z");
		const midnight = getStartOfLocalDay(now, "America/Los_Angeles");
		expect(midnight.toISOString()).toBe("2024-01-15T08:00:00.000Z");
	});
});

function getWeeklySendDayForTest(userId: string): number {
	return hashUserIdForTest(userId) % 7;
}

function getMonthlySendDayForTest(userId: string): number {
	return (hashUserIdForTest(userId) % 28) + 1;
}

function hashUserIdForTest(value: string): number {
	let hash = 0;
	for (let i = 0; i < value.length; i += 1) {
		hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
	}
	return hash;
}
