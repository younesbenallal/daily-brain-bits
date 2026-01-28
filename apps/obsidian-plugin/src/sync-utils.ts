import { createPathFilter } from "@daily-brain-bits/integrations-obsidian";
import type { TFile } from "obsidian";
import type { PendingQueueItem } from "./types";

export function buildRpcUrl(baseUrl: string): string {
	const trimmed = baseUrl.replace(/\/$/, "");
	return trimmed.endsWith("/rpc") ? trimmed : `${trimmed}/rpc`;
}

export function toHeaderRecord(headers: HeadersInit | undefined): Record<string, string> {
	if (!headers) {
		return {};
	}
	if (headers instanceof Headers) {
		const record: Record<string, string> = {};
		headers.forEach((value, key) => {
			record[key] = value;
		});
		return record;
	}
	if (Array.isArray(headers)) {
		return headers.reduce<Record<string, string>>((acc, [key, value]) => {
			acc[key] = value;
			return acc;
		}, {});
	}
	return headers as Record<string, string>;
}

export function toQueueKey(item: PendingQueueItem): string {
	return `${item.op}:${item.externalId}:${item.path}`;
}

export function parseGlobPatterns(glob: string): { include: string[]; exclude: string[] } {
	const lines = glob
		.split("\n")
		.map((pattern) => pattern.trim())
		.filter(Boolean);

	const include: string[] = [];
	const exclude: string[] = [];

	for (const line of lines) {
		if (line.startsWith("!")) {
			const pattern = line.slice(1).trim();
			if (pattern) {
				exclude.push(pattern);
			}
		} else {
			include.push(line);
		}
	}

	return { include, exclude };
}

export function buildScopeFilter(glob: string): (path: string) => boolean {
	const { include, exclude } = parseGlobPatterns(glob);
	if (include.length === 0 && exclude.length === 0) {
		return () => true;
	}
	return createPathFilter({ include, exclude });
}

export function pickFrontmatter(frontmatter?: Record<string, unknown>) {
	if (!frontmatter) {
		return undefined;
	}

	const result: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(frontmatter)) {
		if (key === "position") {
			continue;
		}
		if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
			result[key] = value;
			continue;
		}
		if (Array.isArray(value)) {
			const filtered = value.filter((entry) => typeof entry === "string" || typeof entry === "number" || typeof entry === "boolean");
			if (filtered.length > 0) {
				result[key] = filtered;
			}
		}
	}

	return Object.keys(result).length > 0 ? result : undefined;
}

export function extractAliases(frontmatter?: Record<string, unknown>): string[] {
	const raw = frontmatter?.aliases ?? frontmatter?.alias;
	if (!raw) {
		return [];
	}
	if (Array.isArray(raw)) {
		return raw.filter((item) => typeof item === "string") as string[];
	}
	if (typeof raw === "string") {
		return [raw];
	}
	return [];
}

export function shouldSyncFile(file: TFile, filter: (path: string) => boolean): boolean {
	if (!filter(file.path)) {
		return false;
	}
	return file.extension === "md";
}
