import { useQuery } from "@tanstack/react-query";
import { orpc } from "@/lib/orpc-client";

export function normalizeList<T>(value: unknown): T[] {
	if (Array.isArray(value)) {
		return value as T[];
	}
	if (value && typeof value === "object") {
		const record = value as Record<string, unknown>;
		const candidate = record.data ?? record.items ?? record.accounts ?? record.sessions ?? record.result;
		if (Array.isArray(candidate)) {
			return candidate as T[];
		}
	}
	return [];
}

export function useSettingsCapabilities() {
	const query = useQuery(orpc.settings.capabilities.queryOptions());
	const capabilities = query.data?.capabilities ?? null;
	const entitlements = capabilities?.entitlements
		? {
				...capabilities.entitlements,
				limits: {
					maxNotes: capabilities.entitlements.limits.maxNotes ?? Number.POSITIVE_INFINITY,
					maxSources: capabilities.entitlements.limits.maxSources ?? Number.POSITIVE_INFINITY,
				},
			}
		: null;
	const usage = capabilities?.usage ?? null;
	const isPro = entitlements?.planId === "pro";

	return {
		query,
		capabilities,
		billingEnabled: capabilities?.billingEnabled ?? true,
		isPro: isPro ?? capabilities?.isPro ?? true,
		entitlements,
		usage,
	};
}

export function resolveData<T>(value: unknown): T | null {
	if (!value) {
		return null;
	}
	if (typeof value === "object" && "data" in (value as Record<string, unknown>)) {
		return (value as { data: T }).data ?? null;
	}
	return value as T;
}

export function getCustomerState(value: unknown): Record<string, unknown> | null {
	const data = resolveData<Record<string, unknown>>(value);
	if (!data || typeof data !== "object") {
		return null;
	}
	return data;
}

export function getActiveSubscriptions(state: Record<string, unknown> | null): Record<string, unknown>[] {
	if (!state) {
		return [];
	}

	const subscriptions =
		(state.subscriptions as unknown) ??
		(state.activeSubscriptions as unknown) ??
		(state.active_subscriptions as unknown) ??
		(state.subscription as unknown) ??
		[];

	return normalizeList<Record<string, unknown>>(subscriptions);
}

export function getPlanSummary(state: Record<string, unknown> | null) {
	const activeSubscriptions = getActiveSubscriptions(state);
	const isPro = activeSubscriptions.length > 0;
	const nextBillingDate = getSubscriptionDate(activeSubscriptions[0]);

	return {
		isPro,
		plan: isPro ? "pro" : "free",
		activeSubscriptions,
		nextBillingDate,
	};
}

function getSubscriptionDate(subscription: Record<string, unknown> | undefined) {
	if (!subscription) {
		return null;
	}

	const candidate =
		subscription.current_period_end ??
		subscription.currentPeriodEnd ??
		subscription.next_billing_at ??
		subscription.nextBillingAt;

	if (!candidate || typeof candidate !== "string") {
		return null;
	}

	const date = new Date(candidate);
	return Number.isNaN(date.getTime()) ? null : date;
}
