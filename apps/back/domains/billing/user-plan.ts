import { buildUserEntitlements, type PlanId } from "@daily-brain-bits/core";
import { billingSubscriptions, db } from "@daily-brain-bits/db";
import { and, eq, inArray } from "drizzle-orm";
import { isBillingEnabled } from "./deployment-mode";

export async function getUserPlan(userId: string): Promise<PlanId> {
	if (!isBillingEnabled()) {
		return "pro";
	}

	const subscription = await db.query.billingSubscriptions.findFirst({
		where: and(eq(billingSubscriptions.userId, userId), inArray(billingSubscriptions.status, ["active", "trialing"])),
		columns: { id: true },
	});

	return subscription ? "pro" : "free";
}

export function applySelfHostedOverrides(entitlements: ReturnType<typeof buildUserEntitlements>) {
	if (isBillingEnabled()) {
		return entitlements;
	}

	return {
		...entitlements,
		limits: {
			maxNotes: Number.POSITIVE_INFINITY,
			maxSources: Number.POSITIVE_INFINITY,
			maxNotesPerDigest: entitlements.limits.maxNotesPerDigest,
		},
	};
}
