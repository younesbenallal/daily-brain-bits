export const PLAN_IDS = ["free", "pro"] as const;
export type PlanId = (typeof PLAN_IDS)[number];

export type PlanLimits = {
	maxNotes: number;
	maxSources: number;
};

export type PlanFeatures = {
	dailyDigest: boolean;
	weeklyDigest: boolean;
	monthlyDigest: boolean;
	aiQuizzes: boolean;
};

export type PlanConfig = {
	id: PlanId;
	name: string;
	limits: PlanLimits;
	features: PlanFeatures;
};

export const PLANS: Record<PlanId, PlanConfig> = {
	free: {
		id: "free",
		name: "Free",
		limits: { maxNotes: 500, maxSources: 1 },
		features: {
			dailyDigest: false,
			weeklyDigest: true,
			monthlyDigest: true,
			aiQuizzes: false,
		},
	},
	pro: {
		id: "pro",
		name: "Pro",
		limits: { maxNotes: 10_000, maxSources: Number.POSITIVE_INFINITY },
		features: {
			dailyDigest: true,
			weeklyDigest: true,
			monthlyDigest: true,
			aiQuizzes: true,
		},
	},
};
