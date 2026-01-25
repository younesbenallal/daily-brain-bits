import { billingSubscriptions, db } from "@daily-brain-bits/db";
import { and, inArray } from "drizzle-orm";
import { env } from "./env";

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

export async function getProUsers(userIds: string[]): Promise<Set<string>> {
	if (userIds.length === 0) {
		return new Set();
	}
	if (!isBillingEnabled()) {
		return new Set(userIds);
	}

	const subscriptions = await db.query.billingSubscriptions.findMany({
		where: and(inArray(billingSubscriptions.status, ["active", "trialing"]), inArray(billingSubscriptions.userId, userIds)),
		columns: { userId: true },
	});
	return new Set(subscriptions.map((row) => row.userId));
}

export async function getIsProForUser(userId: string): Promise<boolean> {
	const proUsers = await getProUsers([userId]);
	return proUsers.has(userId);
}

export async function getAllProUsers(): Promise<Set<string>> {
	if (!isBillingEnabled()) {
		const users = await db.query.user.findMany({ columns: { id: true } });
		return new Set(users.map((row) => row.id));
	}

	const subscriptions = await db.query.billingSubscriptions.findMany({
		where: inArray(billingSubscriptions.status, ["active", "trialing"]),
		columns: { userId: true },
	});
	return new Set(subscriptions.map((row) => row.userId));
}
