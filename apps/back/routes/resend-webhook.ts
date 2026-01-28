import { db, emailSends } from "@daily-brain-bits/db";
import { and, eq, isNull } from "drizzle-orm";
import type { Context } from "hono";
import { verifyResendWebhook } from "../domains/email/resend";
import { env } from "../infra/env";

type ResendWebhookEvent = {
	type: string;
	data: {
		id: string;
		created_at?: string;
	};
};

export async function handleResendWebhook(c: Context) {
	if (!env.RESEND_WEBHOOK_SECRET) {
		return c.json({ error: "missing_webhook_secret" }, 400);
	}

	const signature = c.req.header("svix-signature");
	const timestamp = c.req.header("svix-timestamp");
	const id = c.req.header("svix-id");
	if (!signature || !timestamp || !id) {
		return c.json({ error: "missing_signature_headers" }, 400);
	}

	const payload = await c.req.text();
	let event: ResendWebhookEvent;

	try {
		event = verifyResendWebhook({
			payload,
			signature,
			timestamp,
			id,
			secret: env.RESEND_WEBHOOK_SECRET,
		}) as ResendWebhookEvent;
	} catch (error) {
		console.error("[resend-webhook] signature verification failed", error);
		return c.json({ error: "invalid_signature" }, 400);
	}

	const resendId = event?.data?.id;
	if (!resendId) {
		return c.json({ ok: true });
	}

	const occurredAt = event.data.created_at ? new Date(event.data.created_at) : new Date();

	if (event.type === "email.opened") {
		await db
			.update(emailSends)
			.set({ openedAt: occurredAt })
			.where(and(eq(emailSends.resendId, resendId), isNull(emailSends.openedAt)));
	}

	if (event.type === "email.clicked") {
		await db
			.update(emailSends)
			.set({ clickedAt: occurredAt })
			.where(and(eq(emailSends.resendId, resendId), isNull(emailSends.clickedAt)));
	}

	return c.json({ ok: true });
}
