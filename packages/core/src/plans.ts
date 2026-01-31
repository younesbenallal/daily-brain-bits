export const PLAN_IDS = ["free", "pro"] as const;
export type PlanId = (typeof PLAN_IDS)[number];

export type PlanLimits = {
	maxNotes: number;
	maxSources: number;
	maxNotesPerDigest: number;
	/** Minimum days between digests (1 = daily, 3 = every 3 days, etc.) */
	minDigestIntervalDays: number;
	/** Maximum days between digests */
	maxDigestIntervalDays: number;
};

export type PlanFeatures = {
	aiQuizzes: boolean;
};

export type PlanConfig = {
	id: PlanId;
	name: string;
	limits: PlanLimits;
	features: PlanFeatures;
};

/** Default interval for new users (every 7 days) */
export const DEFAULT_DIGEST_INTERVAL_DAYS = 7;

/** Format interval days as human-readable text */
export function formatIntervalLabel(days: number): string {
	if (days === 1) return "Every day";
	if (days === 7) return "Every week";
	if (days === 14) return "Every 2 weeks";
	if (days === 30) return "Every month";
	return `Every ${days} days`;
}

export const PLANS: Record<PlanId, PlanConfig> = {
	free: {
		id: "free",
		name: "Free",
		limits: {
			maxNotes: 500,
			maxSources: 1,
			maxNotesPerDigest: 5,
			minDigestIntervalDays: 3,
			maxDigestIntervalDays: 30,
		},
		features: {
			aiQuizzes: false,
		},
	},
	pro: {
		id: "pro",
		name: "Pro",
		limits: {
			maxNotes: 10_000,
			maxSources: Number.POSITIVE_INFINITY,
			maxNotesPerDigest: 50,
			minDigestIntervalDays: 1,
			maxDigestIntervalDays: 30,
		},
		features: {
			aiQuizzes: true,
		},
	},
};
