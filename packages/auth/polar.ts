import { db, billingCustomers, billingSubscriptions } from "@daily-brain-bits/db";
import { polar, checkout, portal, usage, webhooks } from "@polar-sh/better-auth";
import { Polar } from "@polar-sh/sdk";

const DEFAULT_FRONTEND_URL = "http://localhost:3000";

type PolarWebhookPayload = {
	type?: string;
	data?: Record<string, unknown> | null;
	customer?: Record<string, unknown> | null;
	subscription?: Record<string, unknown> | null;
};

const toDate = (value: unknown) => {
	if (!value) {
		return null;
	}

	const date = new Date(String(value));
	return Number.isNaN(date.getTime()) ? null : date;
};

const toMetadataUserId = (metadata: unknown) => {
	if (!metadata || typeof metadata !== "object") {
		return null;
	}

	const record = metadata as Record<string, unknown>;
	const candidate = record.userId ?? record.user_id ?? record.userid;
	return typeof candidate === "string" && candidate.length > 0 ? candidate : null;
};

const getCustomerFromPayload = (payload: PolarWebhookPayload) => {
	const data = payload.data as Record<string, unknown> | null | undefined;
	const customer = (data?.customer as Record<string, unknown> | undefined) ?? payload.customer;
	return customer ?? null;
};

const getSubscriptionFromPayload = (payload: PolarWebhookPayload) => {
	const data = payload.data as Record<string, unknown> | null | undefined;
	const subscription = (data?.subscription as Record<string, unknown> | undefined) ?? payload.subscription ?? data;
	return subscription ?? null;
};

const upsertCustomerFromPayload = async (payload: PolarWebhookPayload) => {
	const customer = getCustomerFromPayload(payload);
	if (!customer) {
		return;
	}

	const customerId = customer.id;
	if (typeof customerId !== "string") {
		return;
	}

	const userId = toMetadataUserId(customer.metadata);
	if (!userId) {
		return;
	}

	const now = new Date();
	await db
		.insert(billingCustomers)
		.values({
			userId,
			polarCustomerId: customerId,
			email: typeof customer.email === "string" ? customer.email : null,
			metadataJson: customer.metadata ?? null,
			createdAt: now,
			updatedAt: now,
		})
		.onConflictDoUpdate({
			target: [billingCustomers.userId],
			set: {
				polarCustomerId: customerId,
				email: typeof customer.email === "string" ? customer.email : null,
				metadataJson: customer.metadata ?? null,
				updatedAt: now,
			},
		});
};

const resolveUserIdForSubscription = async (subscription: Record<string, unknown>) => {
	const metadataUserId = toMetadataUserId(subscription.metadata);
	if (metadataUserId) {
		return metadataUserId;
	}

	const customerId = subscription.customer_id ?? subscription.customerId;
	if (typeof customerId !== "string") {
		return null;
	}

	const customer = await db.query.billingCustomers.findFirst({
		where: (billingCustomersTable, { eq }) => eq(billingCustomersTable.polarCustomerId, customerId),
	});

	return customer?.userId ?? null;
};

const upsertSubscriptionFromPayload = async (payload: PolarWebhookPayload) => {
	const subscription = getSubscriptionFromPayload(payload);
	if (!subscription) {
		return;
	}

	const subscriptionId = subscription.id;
	if (typeof subscriptionId !== "string") {
		return;
	}

	const userId = await resolveUserIdForSubscription(subscription);
	if (!userId) {
		return;
	}

	const customerId = subscription.customer_id ?? subscription.customerId;
	const now = new Date();
	const status = typeof subscription.status === "string" ? subscription.status : payload.type ?? "unknown";

	await db
		.insert(billingSubscriptions)
		.values({
			id: subscriptionId,
			userId,
			polarCustomerId: typeof customerId === "string" ? customerId : null,
			productId: typeof subscription.product_id === "string" ? subscription.product_id : (subscription.productId as string | undefined) ?? null,
			priceId: typeof subscription.price_id === "string" ? subscription.price_id : (subscription.priceId as string | undefined) ?? null,
			status,
			currentPeriodStart: toDate(subscription.current_period_start ?? subscription.currentPeriodStart),
			currentPeriodEnd: toDate(subscription.current_period_end ?? subscription.currentPeriodEnd),
			cancelAtPeriodEnd:
				typeof subscription.cancel_at_period_end === "boolean"
					? subscription.cancel_at_period_end
					: (subscription.cancelAtPeriodEnd as boolean | null | undefined) ?? null,
			canceledAt: toDate(subscription.canceled_at ?? subscription.canceledAt),
			endedAt: toDate(subscription.ended_at ?? subscription.endedAt),
			metadataJson: (subscription.metadata as Record<string, unknown> | null | undefined) ?? null,
			createdAt: now,
			updatedAt: now,
		})
		.onConflictDoUpdate({
			target: [billingSubscriptions.id],
			set: {
				userId,
				polarCustomerId: typeof customerId === "string" ? customerId : null,
				productId: typeof subscription.product_id === "string" ? subscription.product_id : (subscription.productId as string | undefined) ?? null,
				priceId: typeof subscription.price_id === "string" ? subscription.price_id : (subscription.priceId as string | undefined) ?? null,
				status,
				currentPeriodStart: toDate(subscription.current_period_start ?? subscription.currentPeriodStart),
				currentPeriodEnd: toDate(subscription.current_period_end ?? subscription.currentPeriodEnd),
				cancelAtPeriodEnd:
					typeof subscription.cancel_at_period_end === "boolean"
						? subscription.cancel_at_period_end
						: (subscription.cancelAtPeriodEnd as boolean | null | undefined) ?? null,
				canceledAt: toDate(subscription.canceled_at ?? subscription.canceledAt),
				endedAt: toDate(subscription.ended_at ?? subscription.endedAt),
				metadataJson: (subscription.metadata as Record<string, unknown> | null | undefined) ?? null,
				updatedAt: now,
			},
		});
};

export const createPolarPlugin = () => {
	const accessToken = process.env.POLAR_ACCESS_TOKEN;
	if (!accessToken) {
		return null;
	}

	const polarClient = new Polar({
		accessToken,
		server: process.env.POLAR_SERVER === "sandbox" ? "sandbox" : undefined,
	});

	const successUrl =
		process.env.POLAR_SUCCESS_URL ||
		`${process.env.FRONTEND_URL || DEFAULT_FRONTEND_URL}/settings?tab=billing&checkout_id={CHECKOUT_ID}`;

	const products: { productId: string; slug?: string }[] = [];
	if (process.env.POLAR_PRO_PRODUCT_ID) {
		products.push({
			productId: process.env.POLAR_PRO_PRODUCT_ID,
			slug: "pro",
		});
	}

	const pluginUse = [
		checkout({
			products: products.length > 0 ? products : undefined,
			successUrl,
			authenticatedUsersOnly: true,
		}),
		portal(),
		usage(),
	];

	if (process.env.POLAR_WEBHOOK_SECRET) {
		pluginUse.push(
			webhooks({
				secret: process.env.POLAR_WEBHOOK_SECRET,
				onCustomerStateChanged: upsertCustomerFromPayload,
				onPayload: (payload) => {
					if (payload?.type?.startsWith("subscription.")) {
						return upsertSubscriptionFromPayload(payload);
					}
				},
			}),
		);
	}

	return polar({
		client: polarClient,
		createCustomerOnSignUp: true,
		getCustomerCreateParams: ({ user }) => ({
			metadata: {
				userId: user.id,
			},
		}),
		use: pluginUse,
	});
};
