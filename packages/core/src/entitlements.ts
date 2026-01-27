import { PLANS, type PlanId, type PlanLimits, type PlanFeatures } from "./plans";

export type UserEntitlements = {
	planId: PlanId;
	planName: string;
	limits: PlanLimits;
	features: PlanFeatures;
};

export type UserUsage = {
	noteCount: number;
	sourceCount: number;
};

export type UserEntitlementsWithUsage = UserEntitlements & {
	usage: UserUsage;
	withinLimits: {
		notes: boolean;
		sources: boolean;
	};
};

export function buildUserEntitlements(planId: PlanId): UserEntitlements {
	const plan = PLANS[planId];
	return {
		planId: plan.id,
		planName: plan.name,
		limits: plan.limits,
		features: plan.features,
	};
}
