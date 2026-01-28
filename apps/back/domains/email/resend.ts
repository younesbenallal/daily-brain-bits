import crypto from "node:crypto";
import { Resend } from "resend";
import type { ReactElement } from "react";

type ResendEmailPayload = {
	from: string;
	to: string | string[];
	subject: string;
	text?: string;
	html?: string;
	react?: ReactElement;
	replyTo?: string;
	headers?: Record<string, string>;
	tags?: Array<{ name: string; value: string }>;
} & (
	| { react: ReactElement; text?: string; html?: string }
	| { react?: undefined; text: string; html?: string }
	| { react?: undefined; text?: string; html: string }
);

type ResendSendResult = {
	id: string | null;
	error: { name: string; message: string; statusCode?: number } | null;
};

let cachedClient: Resend | null = null;

function getResendClient(): Resend {
	if (cachedClient) {
		return cachedClient;
	}
	const apiKey = process.env.RESEND_API_KEY;
	if (!apiKey) {
		throw new Error("Missing RESEND_API_KEY");
	}
	cachedClient = new Resend(apiKey);
	return cachedClient;
}

export async function sendResendEmail(params: {
	payload: ResendEmailPayload;
	idempotencyKey: string;
	dryRun?: boolean;
	retry?: { maxRetries?: number; initialDelayMs?: number };
}): Promise<ResendSendResult> {
	if (params.dryRun) {
		return {
			id: `dry-run-${params.idempotencyKey}`,
			error: null,
		};
	}

	const resend = getResendClient();
	const maxRetries = params.retry?.maxRetries ?? 0;
	let delayMs = params.retry?.initialDelayMs ?? 1000;

	for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
		const { data, error } = await resend.emails.send(params.payload, {
			idempotencyKey: params.idempotencyKey,
		});

		if (!error) {
			return {
				id: data?.id ?? null,
				error: null,
			};
		}

		const errorWithStatus = error as unknown as { statusCode?: number };
		const statusCode = typeof errorWithStatus.statusCode === "number" ? errorWithStatus.statusCode : undefined;
		const shouldRetry = statusCode === 429 || statusCode === 500;
		if (!shouldRetry || attempt >= maxRetries) {
			return {
				id: null,
				error: { name: error.name, message: error.message, statusCode },
			};
		}

		await new Promise((resolve) => setTimeout(resolve, delayMs));
		delayMs *= 2;
	}

	return {
		id: null,
		error: { name: "ResendSendError", message: "Resend send failed after retries" },
	};
}

export function verifyResendWebhook(params: { payload: string; signature: string; timestamp: string; id: string; secret: string }) {
	const timestamp = Number(params.timestamp);
	if (!Number.isFinite(timestamp)) {
		throw new Error("Invalid webhook timestamp");
	}

	const nowSeconds = Math.floor(Date.now() / 1000);
	const toleranceSeconds = 5 * 60;
	if (Math.abs(nowSeconds - timestamp) > toleranceSeconds) {
		throw new Error("Webhook timestamp outside tolerance window");
	}

	const secret = params.secret.startsWith("whsec_") ? params.secret.slice("whsec_".length) : params.secret;
	const secretBytes = Buffer.from(secret, "base64");
	const signedContent = `${params.id}.${params.timestamp}.${params.payload}`;
	const expectedSignature = crypto.createHmac("sha256", secretBytes).update(signedContent).digest("base64");

	const signatures = params.signature
		.split(" ")
		.map((entry) => entry.trim())
		.filter(Boolean)
		.map((entry) => entry.split(",")[1])
		.filter((entry): entry is string => Boolean(entry));

	const expectedBuffer = Buffer.from(expectedSignature);
	const matches = signatures.some((signature) => {
		const signatureBuffer = Buffer.from(signature);
		if (signatureBuffer.length !== expectedBuffer.length) {
			return false;
		}
		return crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
	});

	if (!matches) {
		throw new Error("Webhook signature mismatch");
	}

	return JSON.parse(params.payload) as unknown;
}
