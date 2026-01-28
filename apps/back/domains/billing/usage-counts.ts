import { billingSubscriptions, db, documents, integrationConnections } from "@daily-brain-bits/db";
import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { isBillingEnabled } from "./deployment-mode";

export async function countUserDocuments(userId: string): Promise<number> {
	const [row] = await db
		.select({ count: sql<number>`count(${documents.id})`.mapWith(Number) })
		.from(documents)
		.where(and(eq(documents.userId, userId), isNull(documents.deletedAtSource)))
		.limit(1);

	return row?.count ?? 0;
}

export async function countUserConnections(userId: string): Promise<number> {
	const [row] = await db
		.select({ count: sql<number>`count(${integrationConnections.id})`.mapWith(Number) })
		.from(integrationConnections)
		.where(and(eq(integrationConnections.userId, userId), eq(integrationConnections.status, "active")))
		.limit(1);

	return row?.count ?? 0;
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
