export type DigestFrequency = "daily" | "weekly" | "monthly";

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_DAYS = 7;
const MONTH_DAYS = 28;

export function resolveEffectiveFrequency(params: { requested: DigestFrequency; isPro: boolean }): DigestFrequency {
	if (params.isPro) {
		return params.requested;
	}
	return params.requested === "daily" ? "weekly" : params.requested;
}

export function isDigestDue(params: {
	now: Date;
	lastSentAt: Date | null;
	frequency: DigestFrequency;
	userId: string;
}): boolean {
	if (params.lastSentAt && isSameUtcDay(params.now, params.lastSentAt)) {
		return false;
	}
	if (!params.lastSentAt) {
		return isStaggerDay(params.userId, params.frequency, params.now);
	}
	const elapsedMs = params.now.getTime() - params.lastSentAt.getTime();
	const requiredMs = getFrequencyIntervalMs(params.frequency);
	if (elapsedMs < requiredMs) {
		return false;
	}
	return isStaggerDay(params.userId, params.frequency, params.now);
}

export function getFrequencyIntervalMs(frequency: DigestFrequency): number {
	if (frequency === "weekly") {
		return 7 * DAY_MS;
	}
	if (frequency === "monthly") {
		return 30 * DAY_MS;
	}
	return DAY_MS;
}

function isStaggerDay(userId: string, frequency: DigestFrequency, now: Date): boolean {
	if (frequency === "daily") {
		return true;
	}
	if (frequency === "weekly") {
		return now.getUTCDay() === getWeeklySendDay(userId);
	}
	return now.getUTCDate() === getMonthlySendDay(userId);
}

function getWeeklySendDay(userId: string): number {
	return hashUserId(userId) % WEEK_DAYS;
}

function getMonthlySendDay(userId: string): number {
	return (hashUserId(userId) % MONTH_DAYS) + 1;
}

function hashUserId(value: string): number {
	let hash = 0;
	for (let i = 0; i < value.length; i += 1) {
		hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
	}
	return hash;
}

export function isSameUtcDay(a: Date, b: Date): boolean {
	return a.getUTCFullYear() === b.getUTCFullYear() && a.getUTCMonth() === b.getUTCMonth() && a.getUTCDate() === b.getUTCDate();
}
