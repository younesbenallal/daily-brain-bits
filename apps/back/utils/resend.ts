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
	error: { name: string; message: string } | null;
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
}): Promise<ResendSendResult> {
	if (params.dryRun) {
		return {
			id: `dry-run-${params.idempotencyKey}`,
			error: null,
		};
	}

	const resend = getResendClient();
	const { data, error } = await resend.emails.send(params.payload, {
		idempotencyKey: params.idempotencyKey,
	});

	if (error) {
		return {
			id: null,
			error: { name: error.name, message: error.message },
		};
	}

	return {
		id: data?.id ?? null,
		error: null,
	};
}
