import { billingCustomers, billingSubscriptions, db } from "@daily-brain-bits/db";
import { checkout, polar, portal, usage, webhooks } from "@polar-sh/better-auth";
import { Polar } from "@polar-sh/sdk";
import type { WebhookCustomerCreatedPayload } from "@polar-sh/sdk/models/components/webhookcustomercreatedpayload";
import type { WebhookCustomerStateChangedPayload } from "@polar-sh/sdk/models/components/webhookcustomerstatechangedpayload";
import type { WebhookCustomerUpdatedPayload } from "@polar-sh/sdk/models/components/webhookcustomerupdatedpayload";
import type { WebhookSubscriptionActivePayload } from "@polar-sh/sdk/models/components/webhooksubscriptionactivepayload";
import type { WebhookSubscriptionCanceledPayload } from "@polar-sh/sdk/models/components/webhooksubscriptioncanceledpayload";
import type { WebhookSubscriptionCreatedPayload } from "@polar-sh/sdk/models/components/webhooksubscriptioncreatedpayload";
import type { WebhookSubscriptionRevokedPayload } from "@polar-sh/sdk/models/components/webhooksubscriptionrevokedpayload";
import type { WebhookSubscriptionUncanceledPayload } from "@polar-sh/sdk/models/components/webhooksubscriptionuncanceledpayload";
import type { WebhookSubscriptionUpdatedPayload } from "@polar-sh/sdk/models/components/webhooksubscriptionupdatedpayload";
import type { validateEvent } from "@polar-sh/sdk/webhooks";

type PolarWebhookPayload = ReturnType<typeof validateEvent>;

type CustomerWebhookPayload = WebhookCustomerCreatedPayload | WebhookCustomerUpdatedPayload | WebhookCustomerStateChangedPayload;

type SubscriptionWebhookPayload =
	| WebhookSubscriptionCreatedPayload
	| WebhookSubscriptionUpdatedPayload
	| WebhookSubscriptionActivePayload
	| WebhookSubscriptionCanceledPayload
	| WebhookSubscriptionUncanceledPayload
	| WebhookSubscriptionRevokedPayload;

const toMetadataUserId = (metadata: unknown) => {
	if (!metadata || typeof metadata !== "object") {
		return null;
	}

	const record = metadata as Record<string, unknown>;
	const candidate = record.userId ?? record.user_id ?? record.userid;
	return typeof candidate === "string" && candidate.length > 0 ? candidate : null;
};

const isCustomerWebhook = (payload: PolarWebhookPayload): payload is CustomerWebhookPayload => {
	return payload.type === "customer.created" || payload.type === "customer.updated" || payload.type === "customer.state_changed";
};

const isSubscriptionWebhook = (payload: PolarWebhookPayload): payload is SubscriptionWebhookPayload => {
	return (
		payload.type === "subscription.created" ||
		payload.type === "subscription.updated" ||
		payload.type === "subscription.active" ||
		payload.type === "subscription.canceled" ||
		payload.type === "subscription.uncanceled" ||
		payload.type === "subscription.revoked"
	);
};

const getCustomerFromPayload = (payload: CustomerWebhookPayload) => {
	if (payload.type === "customer.state_changed") {
		// CustomerState IS the customer data (it has id, email, etc. directly)
		return payload.data;
	}
	// customer.created and customer.updated have data directly as Customer
	return payload.data ?? null;
};

const getSubscriptionFromPayload = (payload: SubscriptionWebhookPayload) => {
	return payload.data ?? null;
};

const upsertCustomerFromPayload = async (payload: CustomerWebhookPayload) => {
	try {
		const customer = getCustomerFromPayload(payload);
		if (!customer) {
			return;
		}

		const customerId = customer.id;
		if (typeof customerId !== "string") {
			return;
		}

		let userId = toMetadataUserId(customer.metadata);
		if (!userId) {
			// Fallback to externalId if metadata doesn't contain userId
			// According to Polar docs, externalId corresponds to the user's ID in the database
			const externalId = customer.externalId;
			if (typeof externalId === "string" && externalId.length > 0) {
				userId = externalId;
			}
		}
		if (!userId) {
			// Last resort: try to find user by email if customer has an email
			if (typeof customer.email === "string" && customer.email.length > 0) {
				const foundUser = await db.query.user.findFirst({
					where: (usersTable, { eq }) => eq(usersTable.email, customer.email),
				});
				if (foundUser) {
					userId = foundUser.id;
				}
			}
		}
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
	} catch (error) {
		console.error("[polar.webhook] Error upserting customer:", error);
		throw error;
	}
};

const resolveUserIdForSubscription = async (subscription: SubscriptionWebhookPayload["data"]) => {
	const metadataUserId = toMetadataUserId(subscription.metadata);
	if (metadataUserId) {
		return metadataUserId;
	}

	const customerId = subscription.customerId;
	if (typeof customerId !== "string") {
		return null;
	}

	const customer = await db.query.billingCustomers.findFirst({
		where: (billingCustomersTable, { eq }) => eq(billingCustomersTable.polarCustomerId, customerId),
	});

	if (customer?.userId) {
		return customer.userId;
	}

	// If we can't find the customer in our DB, this subscription event might be coming
	// before the customer event, or the customer was created without proper metadata.
	// Try to find the customer by looking up the customer in Polar and then matching by email.
	// Note: We can't directly get email from subscription payload, so we'd need to fetch from Polar API
	// For now, return null
	return null;
};

const upsertSubscriptionFromPayload = async (payload: SubscriptionWebhookPayload) => {
	try {
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

		const customerId = subscription.customerId;
		const now = new Date();
		const status = subscription.status ?? "unknown";
		// Extract first price ID from prices array if available
		const priceId = subscription.prices && subscription.prices.length > 0 && "id" in subscription.prices[0] ? subscription.prices[0].id : null;

		await db
			.insert(billingSubscriptions)
			.values({
				id: subscriptionId,
				userId,
				polarCustomerId: typeof customerId === "string" ? customerId : null,
				productId: subscription.productId ?? null,
				priceId: typeof priceId === "string" ? priceId : null,
				status,
				currentPeriodStart: subscription.currentPeriodStart,
				currentPeriodEnd: subscription.currentPeriodEnd,
				cancelAtPeriodEnd: subscription.cancelAtPeriodEnd ?? null,
				canceledAt: subscription.canceledAt,
				endedAt: subscription.endedAt,
				metadataJson: subscription.metadata ?? null,
				createdAt: now,
				updatedAt: now,
			})
			.onConflictDoUpdate({
				target: [billingSubscriptions.id],
				set: {
					userId,
					polarCustomerId: typeof customerId === "string" ? customerId : null,
					productId: subscription.productId ?? null,
					priceId: typeof priceId === "string" ? priceId : null,
					status,
					currentPeriodStart: subscription.currentPeriodStart,
					currentPeriodEnd: subscription.currentPeriodEnd,
					cancelAtPeriodEnd: subscription.cancelAtPeriodEnd ?? null,
					canceledAt: subscription.canceledAt,
					endedAt: subscription.endedAt,
					metadataJson: subscription.metadata ?? null,
					updatedAt: now,
				},
			});
	} catch (error) {
		console.error("[polar.webhook] Error upserting subscription:", error);
		throw error;
	}
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

	const successUrl = `${process.env.FRONTEND_URL}/settings?tab=billing&checkout_id={CHECKOUT_ID}`;

	const products: { productId: string; slug?: string }[] = [];
	if (process.env.POLAR_PRO_PRODUCT_ID) {
		products.push({
			productId: process.env.POLAR_PRO_PRODUCT_ID,
			slug: "Pro plan",
		});
	}

	const pluginUse = [
		checkout({
			products: products.length > 0 ? (products.map((p) => ({ ...p, slug: p.slug ?? "" })) as { productId: string; slug: string }[]) : undefined,
			successUrl,
			authenticatedUsersOnly: true,
		}),
		portal(),
		usage(),
	];

	if (process.env.POLAR_WEBHOOK_SECRET) {
		const webhookPlugin = webhooks({
			secret: process.env.POLAR_WEBHOOK_SECRET,
			onCustomerStateChanged: (payload) => {
				return upsertCustomerFromPayload(payload);
			},
			onPayload: async (payload) => {
				try {
					if (isSubscriptionWebhook(payload)) {
						return await upsertSubscriptionFromPayload(payload);
					}
					if (isCustomerWebhook(payload) && payload.type !== "customer.state_changed") {
						// Handle customer.created and customer.updated separately
						return await upsertCustomerFromPayload(payload);
					}
				} catch (error) {
					console.error("[polar.webhook] Error in onPayload handler:", error);
					throw error;
				}
			},
		});
		// @ts-expect-error
		pluginUse.push(webhookPlugin);
	}

	return polar({
		client: polarClient,
		createCustomerOnSignUp: true,
		getCustomerCreateParams: async ({ user }) => {
			// If user.id is undefined during signup, don't set metadata
			// The webhook processing will use externalId as fallback
			if (!user.id) {
				return {};
			}
			return {
				metadata: {
					userId: user.id,
				},
			};
		},
		use: pluginUse as Parameters<typeof polar>[0]["use"],
	});
};
