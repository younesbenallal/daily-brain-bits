import { useMutation, useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { authClient, useSession } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";
import { Progress } from "../ui/progress";
import { getCustomerState, getPlanSummary, normalizeList, resolveData, useSettingsCapabilities } from "./settings-utils";
import { StatusMessage, type StatusMessageState } from "./status-message";

const orderListQuery = { page: 1, limit: 5 };

export function BillingSettings() {
	const sessionQuery = useSession();
	const user = sessionQuery.data?.user;
	const [billingStatus, setBillingStatus] = useState<StatusMessageState>(null);
	const { capabilities, entitlements, usage } = useSettingsCapabilities();
	const billingEnabled = capabilities?.billingEnabled ?? true;

	const customerStateQuery = useQuery({
		queryKey: ["billing", "customer-state"],
		queryFn: () => authClient.customer.state(),
		enabled: Boolean(user) && billingEnabled,
	});

	const ordersQuery = useQuery({
		queryKey: ["billing", "orders"],
		queryFn: () => authClient.customer.orders.list({ query: orderListQuery }),
		enabled: Boolean(user) && billingEnabled,
	});

	const customerState = getCustomerState(customerStateQuery.data);
	const planSummary = getPlanSummary(customerState);
	const orders = normalizeList<Record<string, unknown>>(resolveData(ordersQuery.data));
	const hasOrders = orders.length > 0;

	const checkoutMutation = useMutation({
		mutationFn: async () => authClient.checkout({ slug: "Pro plan" }),
		onError: (error) => {
			setBillingStatus({
				tone: "error",
				message: error instanceof Error ? error.message : "Unable to start checkout.",
			});
		},
	});

	const portalMutation = useMutation({
		mutationFn: async () => authClient.customer.portal(),
		onError: (error) => {
			setBillingStatus({
				tone: "error",
				message: error instanceof Error ? error.message : "Unable to open customer portal.",
			});
		},
	});

	const nextBillingLabel = useMemo(() => {
		if (!planSummary.nextBillingDate) {
			return null;
		}
		return new Intl.DateTimeFormat(undefined, { dateStyle: "long" }).format(planSummary.nextBillingDate);
	}, [planSummary.nextBillingDate]);

	if (!billingEnabled) {
		return (
			<div className="rounded-lg border border-primary/20 bg-primary/5 p-6">
				<h3 className="font-semibold text-primary">Self-hosted plan</h3>
				<p className="mt-1 text-sm text-primary/80">Billing is disabled in self-hosted mode. All features are enabled.</p>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div className="rounded-lg border border-primary/20 bg-primary/5 p-6">
				<div className="flex flex-wrap items-center justify-between gap-3">
					<div>
						<h3 className="font-semibold text-primary">Current Plan: {planSummary.isPro ? "Pro" : "Free"}</h3>
						<p className="mt-1 text-sm text-primary/80">
							{planSummary.isPro
								? nextBillingLabel
									? `Next billing date: ${nextBillingLabel}.`
									: "Manage your subscription or update payment details."
								: "Upgrade to unlock daily emails, AI quizzes, and multiple sources."}
						</p>
					</div>
					<Button
						type="button"
						className={cn((planSummary.isPro ? portalMutation.isPending : checkoutMutation.isPending) && "opacity-60")}
						disabled={planSummary.isPro ? portalMutation.isPending : checkoutMutation.isPending}
						onClick={() => {
							setBillingStatus(null);
							if (planSummary.isPro) {
								portalMutation.mutate();
								return;
							}
							checkoutMutation.mutate();
						}}
					>
						{planSummary.isPro ? "Manage Subscription" : "Upgrade to Pro"}
					</Button>
				</div>
				<StatusMessage status={billingStatus} />
			</div>

			{usage && entitlements && <UsageSection usage={usage} entitlements={entitlements} isPro={planSummary.isPro} />}

			<div className="space-y-4">
				<h3 className="text-lg font-medium">Invoices & Orders</h3>
				{hasOrders ? (
					<div className="divide-y rounded-lg border">
						{orders.map((order) => {
							const orderId = String(order.id ?? order.order_id ?? order.orderId ?? "order");
							const dateLabel = formatOrderDate(order);
							const amountLabel = formatOrderAmount(order);
							const statusLabel = formatOrderStatus(order);
							const receiptUrl = getOrderReceiptUrl(order);
							return (
								<div key={orderId} className="flex flex-col gap-3 p-4 text-sm md:flex-row md:items-center md:justify-between">
									<div className="flex flex-wrap gap-4">
										<span className="text-muted-foreground">{dateLabel}</span>
										<span className="font-medium">{amountLabel}</span>
										<span className="font-medium text-primary">{statusLabel}</span>
									</div>
									{receiptUrl ? (
										<a className="text-primary hover:underline" href={receiptUrl} target="_blank" rel="noreferrer">
											Download
										</a>
									) : (
										<button
											type="button"
											className="text-primary hover:underline"
											onClick={() => {
												setBillingStatus(null);
												portalMutation.mutate();
											}}
										>
											View in portal
										</button>
									)}
								</div>
							);
						})}
					</div>
				) : (
					<div className="rounded-lg border p-4">
						<p className="text-sm text-muted-foreground">No invoices yet. When you upgrade, your receipts will appear here.</p>
						<button
							type="button"
							className={cn("mt-3 text-sm text-primary hover:underline", portalMutation.isPending && "opacity-60")}
							disabled={portalMutation.isPending}
							onClick={() => {
								setBillingStatus(null);
								portalMutation.mutate();
							}}
						>
							Open customer portal
						</button>
					</div>
				)}
			</div>
		</div>
	);
}

function UsageSection({
	usage,
	entitlements,
	isPro,
}: {
	usage: { noteCount: number; sourceCount: number };
	entitlements: {
		limits: { maxNotes: number; maxSources: number };
	};
	isPro: boolean;
}) {
	const noteLimit = entitlements.limits.maxNotes;
	const sourceLimit = entitlements.limits.maxSources;
	const notePercent = noteLimit === Number.POSITIVE_INFINITY ? 0 : Math.min((usage.noteCount / noteLimit) * 100, 100);
	const sourcePercent = sourceLimit === Number.POSITIVE_INFINITY ? 0 : Math.min((usage.sourceCount / sourceLimit) * 100, 100);
	const isNearNoteLimit = notePercent >= 80;
	const isNearSourceLimit = sourcePercent >= 80;

	return (
		<div className="space-y-4">
			<h3 className="text-lg font-medium">Usage</h3>
			<div className="rounded-lg border p-4 space-y-4">
				<div className="space-y-2">
					<div className="flex items-center justify-between text-sm">
						<span className="text-muted-foreground">Notes synced</span>
						<span className={cn("font-medium", isNearNoteLimit && !isPro && "text-amber-600")}>
							{usage.noteCount.toLocaleString()} / {noteLimit === Number.POSITIVE_INFINITY ? "∞" : noteLimit.toLocaleString()}
						</span>
					</div>
					{noteLimit !== Number.POSITIVE_INFINITY && (
						<Progress value={notePercent} className={cn("h-2", isNearNoteLimit && !isPro && "[&>div]:bg-amber-500")} />
					)}
				</div>
				<div className="space-y-2">
					<div className="flex items-center justify-between text-sm">
						<span className="text-muted-foreground">Sources connected</span>
						<span className={cn("font-medium", isNearSourceLimit && !isPro && "text-amber-600")}>
							{usage.sourceCount} / {sourceLimit === Number.POSITIVE_INFINITY ? "∞" : sourceLimit}
						</span>
					</div>
					{sourceLimit !== Number.POSITIVE_INFINITY && (
						<Progress value={sourcePercent} className={cn("h-2", isNearSourceLimit && !isPro && "[&>div]:bg-amber-500")} />
					)}
				</div>
				{!isPro && (isNearNoteLimit || isNearSourceLimit) && (
					<p className="text-xs text-amber-600">You're approaching your plan limits. Upgrade to Pro for higher limits.</p>
				)}
			</div>
		</div>
	);
}

function formatOrderDate(order: Record<string, unknown>) {
	const candidate = order.paid_at ?? order.paidAt ?? order.created_at ?? order.createdAt ?? order.updated_at ?? order.updatedAt;
	if (!candidate || typeof candidate !== "string") {
		return "—";
	}
	const date = new Date(candidate);
	return Number.isNaN(date.getTime()) ? "—" : new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
}

function formatOrderAmount(order: Record<string, unknown>) {
	const rawAmount =
		(order.amount as number | undefined) ??
		(order.total_amount as number | undefined) ??
		(order.totalAmount as number | undefined) ??
		(order.amount_total as number | undefined) ??
		(order.total as number | undefined);
	const currency =
		(order.currency as string | undefined) ?? (order.currency_code as string | undefined) ?? (order.currencyCode as string | undefined);

	if (typeof rawAmount !== "number" || !currency) {
		return rawAmount ? String(rawAmount) : "—";
	}

	const amount = rawAmount >= 1000 ? rawAmount / 100 : rawAmount;
	return new Intl.NumberFormat(undefined, { style: "currency", currency: currency.toUpperCase() }).format(amount);
}

function formatOrderStatus(order: Record<string, unknown>) {
	const status = (order.status as string | undefined) ?? (order.payment_status as string | undefined) ?? "paid";
	return status
		.split("_")
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join(" ");
}

function getOrderReceiptUrl(order: Record<string, unknown>) {
	const candidate =
		(order.invoice_url as string | undefined) ??
		(order.receipt_url as string | undefined) ??
		(order.receiptUrl as string | undefined) ??
		(order.hosted_invoice_url as string | undefined) ??
		(order.hostedInvoiceUrl as string | undefined);

	return candidate ?? null;
}
