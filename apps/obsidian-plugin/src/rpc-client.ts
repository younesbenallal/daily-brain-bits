import type ORPCRouterType from "@daily-brain-bits/back";
import { createORPCClient, toORPCError } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import type { RouterClient } from "@orpc/server";
import { Notice, requestUrl } from "obsidian";
import type { SyncBatchResponse, SyncItem } from "@daily-brain-bits/integrations-obsidian";
import { buildRpcUrl, toHeaderRecord } from "./sync-utils";

const maxBackoffMs = 60_000;

export async function fetchWithObsidianRequest(request: Request, init?: RequestInit): Promise<Response> {
	const requestHeaders: Record<string, string> = {};
	request.headers.forEach((value, key) => {
		requestHeaders[key] = value;
	});
	const initHeaders = toHeaderRecord(init?.headers);
	const headers = { ...requestHeaders, ...initHeaders };

	let body: string | undefined;
	if (typeof init?.body === "string") {
		body = init.body;
	} else if (init?.body) {
		body = String(init.body);
	} else {
		try {
			body = await request.text();
		} catch {
			body = undefined;
		}
	}

	const response = await requestUrl({
		url: request.url,
		method: init?.method ?? request.method ?? "POST",
		contentType: headers["content-type"] ?? headers["Content-Type"] ?? "application/json",
		headers,
		body,
		throw: false,
	});

	const responseHeaders = new Headers();
	if (response.headers) {
		for (const [key, value] of Object.entries(response.headers)) {
			if (typeof value === "string") {
				responseHeaders.set(key, value);
			}
		}
	}

	return new Response(response.text, {
		status: response.status,
		headers: responseHeaders,
	});
}

export class RPCClient {
	private client: RouterClient<ORPCRouterType>;
	private backoffMs = 1_000;

	constructor(apiBaseUrl: string, pluginToken?: string) {
		this.client = this.createClient(apiBaseUrl, pluginToken);
	}

	updateSettings(apiBaseUrl: string, pluginToken?: string) {
		this.client = this.createClient(apiBaseUrl, pluginToken);
	}

	private createClient(apiBaseUrl: string, pluginToken?: string): RouterClient<ORPCRouterType> {
		const link = new RPCLink({
			url: () => buildRpcUrl(apiBaseUrl),
			headers: () => {
				return pluginToken ? { "x-api-key": pluginToken } : {};
			},
			fetch: fetchWithObsidianRequest,
		});
		return createORPCClient<RouterClient<ORPCRouterType>>(link);
	}

	async sendBatch(
		vaultId: string,
		vaultName: string | undefined,
		deviceId: string,
		items: SyncItem[],
	): Promise<SyncBatchResponse | null> {
		if (items.length === 0) {
			return null;
		}

		const payload = {
			vaultId,
			vaultName: vaultName && vaultName.trim().length > 0 ? vaultName : undefined,
			deviceId,
			sentAt: new Date().toISOString(),
			items,
		};

		try {
			const result = await this.client.obsidian.sync.batch(payload);
			this.backoffMs = 1_000;
			return result as SyncBatchResponse;
		} catch (error) {
			const orpcError = toORPCError(error);
			if (orpcError.status === 401) {
				new Notice("Daily Brain Bits: token invalid. Reconnect.");
				return null;
			}

			if (orpcError.status === 400) {
				new Notice(`Daily Brain Bits: validation error - ${orpcError.message || "check sync data"}`);
				return null;
			}

			if (orpcError.status === 429 || orpcError.status === 503) {
				this.backoffMs = Math.min(this.backoffMs * 2, maxBackoffMs);
				return null;
			}

			this.backoffMs = Math.min(this.backoffMs * 2, maxBackoffMs);
			return null;
		}
	}

	getBackoffMs(): number {
		return this.backoffMs;
	}
}