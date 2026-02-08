const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Clamp digest interval to user's plan limits.
 */
export function clampIntervalToLimits(params: {
	requested: number;
	limits: { minDigestIntervalDays: number; maxDigestIntervalDays: number };
}): number {
	return Math.max(params.limits.minDigestIntervalDays, Math.min(params.requested, params.limits.maxDigestIntervalDays));
}

/**
 * Legacy function for backward compatibility.
 * Use isDigestDueWithTimezone for timezone-aware scheduling.
 */
export function isDigestDue(params: {
	now: Date;
	lastSentAt: Date | null;
	intervalDays: number;
}): boolean {
	const { now, lastSentAt, intervalDays } = params;

	// Prevent multiple sends on the same day
	if (lastSentAt && isSameUtcDay(now, lastSentAt)) {
		return false;
	}

	// First digest is always due
	if (!lastSentAt) {
		return true;
	}

	// Check if enough days have elapsed
	const elapsedMs = now.getTime() - lastSentAt.getTime();
	const requiredMs = intervalDays * DAY_MS;
	return elapsedMs >= requiredMs;
}

/**
 * Timezone-aware digest due check.
 * Returns true if the user should receive a digest now based on their local time.
 */
export function isDigestDueWithTimezone(params: {
	now: Date;
	lastSentAt: Date | null;
	intervalDays: number;
	timezone: string;
	preferredSendHour: number;
}): boolean {
	const { now, lastSentAt, intervalDays, timezone, preferredSendHour } = params;

	// Check if we're in the user's preferred send window
	if (!isInSendWindow({ now, timezone, preferredSendHour })) {
		return false;
	}

	// Check if already sent today (in user's local time)
	if (lastSentAt && isSameLocalDay(now, lastSentAt, timezone)) {
		return false;
	}

	// First digest is always due (once in send window)
	if (!lastSentAt) {
		return true;
	}

	// Check if enough days have elapsed
	const elapsedMs = now.getTime() - lastSentAt.getTime();
	const requiredMs = intervalDays * DAY_MS;
	return elapsedMs >= requiredMs;
}

/**
 * Convert interval days to milliseconds.
 */
export function getIntervalMs(intervalDays: number): number {
	return intervalDays * DAY_MS;
}

export function isSameUtcDay(a: Date, b: Date): boolean {
	return a.getUTCFullYear() === b.getUTCFullYear() && a.getUTCMonth() === b.getUTCMonth() && a.getUTCDate() === b.getUTCDate();
}

/**
 * Check if two dates are the same day in the user's local timezone.
 */
export function isSameLocalDay(a: Date, b: Date, timezone: string): boolean {
	return getDateInTimezone(a, timezone) === getDateInTimezone(b, timezone);
}

/**
 * Check if now is within the user's preferred send window (within the hour).
 */
export function isInSendWindow(params: { now: Date; timezone: string; preferredSendHour: number }): boolean {
	const userLocalHour = getHourInTimezone(params.now, params.timezone);
	return userLocalHour === params.preferredSendHour;
}

/**
 * Get current hour (0-23) in a specific timezone.
 */
export function getHourInTimezone(date: Date, timezone: string): number {
	const formatter = new Intl.DateTimeFormat("en-US", {
		timeZone: timezone,
		hour: "numeric",
		hour12: false,
	});
	return Number.parseInt(formatter.format(date), 10);
}

/**
 * Get current date string (YYYY-MM-DD) in a specific timezone.
 */
export function getDateInTimezone(date: Date, timezone: string): string {
	const formatter = new Intl.DateTimeFormat("en-CA", {
		timeZone: timezone,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	});
	return formatter.format(date);
}

export function getStartOfLocalDay(date: Date, timezone: string): Date {
	const parts = new Intl.DateTimeFormat("en-CA", {
		timeZone: timezone,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	}).formatToParts(date);
	const year = Number(getDatePart(parts, "year"));
	const month = Number(getDatePart(parts, "month"));
	const day = Number(getDatePart(parts, "day"));
	const utcDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
	const offsetMs = getTimeZoneOffsetMs(utcDate, timezone);
	return new Date(utcDate.getTime() - offsetMs);
}

/**
 * Get the day of week (0-6, Sunday=0) in a specific timezone.
 */
export function getDayOfWeekInTimezone(date: Date, timezone: string): number {
	const formatter = new Intl.DateTimeFormat("en-US", {
		timeZone: timezone,
		weekday: "short",
	});
	const dayName = formatter.format(date);
	const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
	return days.indexOf(dayName);
}

/**
 * Get the day of month (1-31) in a specific timezone.
 */
export function getDayOfMonthInTimezone(date: Date, timezone: string): number {
	const formatter = new Intl.DateTimeFormat("en-US", {
		timeZone: timezone,
		day: "numeric",
	});
	return Number.parseInt(formatter.format(date), 10);
}

/**
 * Validate that a timezone string is a valid IANA timezone.
 */
export function isValidTimezone(tz: string): boolean {
	try {
		Intl.DateTimeFormat(undefined, { timeZone: tz });
		return true;
	} catch {
		return false;
	}
}

function getDatePart(parts: Intl.DateTimeFormatPart[], type: string): string {
	return parts.find((part) => part.type === type)?.value ?? "";
}

function getTimeZoneOffsetMs(date: Date, timezone: string): number {
	// Use hourCycle: "h23" to ensure 0-23 hour range.
	// Using hour12: false can return "24" for midnight in some Node.js/ICU versions,
	// which causes Date.UTC to interpret it as the next day.
	const parts = new Intl.DateTimeFormat("en-US", {
		timeZone: timezone,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
		hourCycle: "h23",
	}).formatToParts(date);

	const year = Number(getDatePart(parts, "year"));
	const month = Number(getDatePart(parts, "month"));
	const day = Number(getDatePart(parts, "day"));
	const hour = Number(getDatePart(parts, "hour"));
	const minute = Number(getDatePart(parts, "minute"));
	const second = Number(getDatePart(parts, "second"));

	const asUtc = Date.UTC(year, month - 1, day, hour, minute, second);
	return asUtc - date.getTime();
}

/**
 * Get supported IANA timezones.
 * Uses Intl.supportedValuesOf when available (Node 18+), otherwise returns common timezones.
 */
function getSupportedTimezones(): readonly string[] {
	// Intl.supportedValuesOf is available in Node 18+ and modern browsers
	const supportedValuesOf = (Intl as { supportedValuesOf?: (key: string) => string[] }).supportedValuesOf;
	if (supportedValuesOf) {
		return supportedValuesOf("timeZone");
	}
	// Fallback to common timezones
	return COMMON_TIMEZONES;
}

const COMMON_TIMEZONES = [
	"UTC",
	"America/New_York",
	"America/Chicago",
	"America/Denver",
	"America/Los_Angeles",
	"America/Anchorage",
	"Pacific/Honolulu",
	"America/Toronto",
	"America/Vancouver",
	"America/Mexico_City",
	"America/Sao_Paulo",
	"Europe/London",
	"Europe/Paris",
	"Europe/Berlin",
	"Europe/Amsterdam",
	"Europe/Madrid",
	"Europe/Rome",
	"Europe/Moscow",
	"Africa/Cairo",
	"Africa/Johannesburg",
	"Asia/Dubai",
	"Asia/Kolkata",
	"Asia/Bangkok",
	"Asia/Singapore",
	"Asia/Hong_Kong",
	"Asia/Shanghai",
	"Asia/Tokyo",
	"Asia/Seoul",
	"Australia/Sydney",
	"Australia/Melbourne",
	"Pacific/Auckland",
] as const;

/**
 * Get all timezones where the current local hour matches a given hour.
 * Used for efficient batch querying in the cron job.
 */
export function getTimezonesAtHour(now: Date, targetHour: number): Set<string> {
	const timezones = getSupportedTimezones();
	const result = new Set<string>();

	for (const tz of timezones) {
		const localHour = getHourInTimezone(now, tz);
		if (localHour === targetHour) {
			result.add(tz);
		}
	}
	return result;
}

/**
 * Get all timezones where the current local hour is within a range.
 * Useful for batching common send hours (e.g., 6-10am).
 */
export function getTimezonesInHourRange(now: Date, startHour: number, endHour: number): Set<string> {
	const timezones = getSupportedTimezones();
	const result = new Set<string>();

	for (const tz of timezones) {
		const localHour = getHourInTimezone(now, tz);
		if (localHour >= startHour && localHour <= endHour) {
			result.add(tz);
		}
	}
	return result;
}

