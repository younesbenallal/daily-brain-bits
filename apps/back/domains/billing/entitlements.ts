import { buildUserEntitlements } from "@daily-brain-bits/core";
import { applySelfHostedOverrides, getUserPlan } from "./user-plan";

// Re-export everything for backward compatibility
export {
	type DeploymentMode,
	type BillingMode,
	getDeploymentMode,
	getBillingMode,
	isBillingEnabled,
} from "./deployment-mode";

export { getUserPlan, applySelfHostedOverrides } from "./user-plan";

export {
	countUserDocuments,
	countUserConnections,
	getProUsers,
	getIsProForUser,
	getAllProUsers,
} from "./usage-counts";

// Facade function that composes the above
export async function getUserEntitlements(userId: string) {
	const planId = await getUserPlan(userId);
	const entitlements = buildUserEntitlements(planId);
	return applySelfHostedOverrides(entitlements);
}
