import { env } from "../../infra/env";

export type DeploymentMode = "cloud" | "self-hosted";
export type BillingMode = "polar" | "disabled";

export function getDeploymentMode(): DeploymentMode {
	return env.DEPLOYMENT_MODE === "self-hosted" ? "self-hosted" : "cloud";
}

export function getBillingMode(): BillingMode {
	return getDeploymentMode() === "self-hosted" ? "disabled" : "polar";
}

export function isBillingEnabled(): boolean {
	return getBillingMode() === "polar";
}
