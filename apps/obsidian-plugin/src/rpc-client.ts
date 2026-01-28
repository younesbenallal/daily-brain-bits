import type ORPCRouterType from "@daily-brain-bits/back";
import type { ObsidianConnectResponse, SyncBatchResponse, SyncItem } from "@daily-brain-bits/integrations-obsidian";
import { createORPCClient, toORPCError } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import type { RouterClient } from "@orpc/server";
import { Notice, requestUrl } from "obsidian";
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
	private apiBaseUrl: string;
	private lastError: string | null = null;

	constructor(apiBaseUrl: string, pluginToken?: string) {
		this.apiBaseUrl = apiBaseUrl;
		this.client = this.createClient(apiBaseUrl, pluginToken);
	}

	updateSettings(apiBaseUrl: string, pluginToken?: string) {
		this.apiBaseUrl = apiBaseUrl;
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

	async sendBatch(vaultId: string, vaultName: string | undefined, deviceId: string, items: SyncItem[]): Promise<SyncBatchResponse | null> {
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
			this.lastError = null;

			return result as SyncBatchResponse;
		} catch (error) {
			const orpcError = toORPCError(error);

			// Auth errors - stop retrying, user must fix token
			if (orpcError.status === 401 || orpcError.status === 403 || orpcError.status === 500) {
				new Notice("Daily Brain Bits: auth failed. Check your API token.");
				this.lastError = "auth_failed";
				this.backoffMs = maxBackoffMs; // Stop spamming by using max backoff
				return null;
			}

			if (orpcError.status === 400) {
				new Notice(`Daily Brain Bits: validation error - ${orpcError.message || "check sync data"}`);
				this.lastError = orpcError.message ? `validation_error: ${orpcError.message}` : "validation_error";
				return null;
			}

			if (orpcError.status === 429 || orpcError.status === 503) {
				this.lastError = "rate_limited";
				this.backoffMs = Math.min(this.backoffMs * 2, maxBackoffMs);
				return null;
			}

			this.lastError = "request_failed";
			this.backoffMs = Math.min(this.backoffMs * 2, maxBackoffMs);
			return null;
		}
	}

	async connect(vaultId: string, vaultName: string | undefined, deviceId: string | undefined): Promise<ObsidianConnectResponse | null> {
		try {
			const result = await this.client.obsidian.connect({
				vaultId,
				vaultName: vaultName && vaultName.trim().length > 0 ? vaultName : undefined,
				deviceId: deviceId && deviceId.trim().length > 0 ? deviceId : undefined,
			});
			this.lastError = null;
			return result as ObsidianConnectResponse;
		} catch (error) {
			const orpcError = toORPCError(error);

			if (orpcError.status === 401 || orpcError.status === 403 || orpcError.status === 500) {
				new Notice("Daily Brain Bits: auth failed. Check your API token.");
				this.lastError = "auth_failed";
				return null;
			}

			if (orpcError.status === 400) {
				new Notice(`Daily Brain Bits: validation error - ${orpcError.message || "check connection data"}`);
				this.lastError = orpcError.message ? `validation_error: ${orpcError.message}` : "validation_error";
				return null;
			}

			this.lastError = "request_failed";
			return null;
		}
	}

	async signalSyncComplete(vaultId: string): Promise<boolean> {
		try {
			const result = await this.client.obsidian.sync.complete({ vaultId });
			this.lastError = null;
			return result?.success ?? false;
		} catch (error) {
			const orpcError = toORPCError(error);

			if (orpcError.status === 401 || orpcError.status === 403) {
				this.lastError = "auth_failed";
				return false;
			}

			this.lastError = "request_failed";
			return false;
		}
	}

	getBackoffMs(): number {
		return this.backoffMs;
	}

	getLastError(): string | null {
		return this.lastError;
	}
}
