import { createConcurrencyPool, normalizeForHash, type SyncItem, sha256Hex } from "@daily-brain-bits/core";
import { APIErrorCode, type Client, isNotionClientError, iteratePaginatedAPI } from "@notionhq/client";
import type {
	BlockObjectResponse,
	PageObjectResponse,
	PartialBlockObjectResponse,
	PartialPageObjectResponse,
	RichTextItemResponse,
} from "@notionhq/client/build/src/api-endpoints";
import { createNotionRequest } from "./client";
import type { NotionBlockWithChildren } from "./markdown";
import { blocksToMarkdown, richTextToMarkdown } from "./markdown";
import type { NotionRequest, NotionSyncError, NotionSyncOptions, NotionSyncResult } from "./types";

const defaultPageSize = 100;
const defaultSafetyMarginSeconds = 2;
const defaultConcurrency = 4;

export async function syncDatabases(notion: Client, databaseIds: string[], options: NotionSyncOptions = {}): Promise<NotionSyncResult> {
	const request = options.request ?? createNotionRequest();
	const aggregateStats = createStats();
	const aggregate: NotionSyncResult = {
		items: [],
		errors: [],
		stats: aggregateStats,
		nextCursor: options.cursor ?? { since: new Date().toISOString() },
	};

	for (const databaseId of databaseIds) {
		const result = await syncDatabase(notion, databaseId, {
			...options,
			request,
		});

		aggregate.items.push(...result.items);
		aggregate.errors.push(...result.errors);
		mergeStats(aggregate.stats, result.stats);
		aggregate.nextCursor = pickLatestCursor(aggregate.nextCursor, result.nextCursor);
	}

	return aggregate;
}

export async function syncDatabase(notion: Client, databaseId: string, options: NotionSyncOptions = {}): Promise<NotionSyncResult> {
	const request = options.request ?? createNotionRequest();
	const pageSize = options.pageSize ?? defaultPageSize;
	const concurrency = options.concurrency ?? defaultConcurrency;
	const safetyMarginSeconds = options.safetyMarginSeconds ?? defaultSafetyMarginSeconds;
	const filterAfterIso = options.cursor?.since ? shiftIsoSeconds(options.cursor.since, -safetyMarginSeconds) : null;

	const query = (args: Parameters<Client["databases"]["query"]>[0]) => request(() => notion.databases.query(args));

	const queryArgs: Parameters<Client["databases"]["query"]>[0] = {
		database_id: databaseId,
		page_size: pageSize,
		sorts: [{ timestamp: "last_edited_time", direction: "descending" }],
	};
	if (filterAfterIso) {
		queryArgs.filter = {
			timestamp: "last_edited_time",
			last_edited_time: {
				after: filterAfterIso,
			},
		};
	}

	// Collect pages from iterator first
	const pages: PageObjectResponse[] = [];
	const iterator = iteratePaginatedAPI(query, queryArgs);
	for await (const page of iterator) {
		pages.push(page as PageObjectResponse);
		if (options.maxPages && pages.length >= options.maxPages) {
			break;
		}
	}

	// Process pages in parallel with concurrency limit
	type PageResult =
		| { status: "success"; item: SyncItem; lastEditedTime: string }
		| { status: "skipped" }
		| { status: "error"; error: NotionSyncError; fatal?: boolean };

	const pool = createConcurrencyPool(concurrency);

	const pagePromises = pages.map(async (page): Promise<PageResult> => {
		await pool.acquire();
		try {
			console.log("[notion.sync] Page", page.id);

			const fullPage = await fetchFullPage(notion, page, request);
			if (!fullPage) {
				return { status: "skipped" };
			}

			if (isPageArchivedOrTrashed(fullPage)) {
				return { status: "skipped" };
			}

			options.onPage?.({
				databaseId,
				pageId: page.id,
				lastEditedAt: fullPage.last_edited_time,
			});

			const item = await pageToSyncItem(notion, fullPage, databaseId, request, {
				pageSize,
				concurrency,
			});

			return {
				status: "success",
				item,
				lastEditedTime: fullPage.last_edited_time,
			};
		} catch (error: unknown) {
			const syncError = toSyncError(error, page.id);
			return {
				status: "error",
				error: syncError,
				fatal: syncError.code === APIErrorCode.Unauthorized,
			};
		} finally {
			pool.release();
		}
	});

	const results = await Promise.all(pagePromises);

	// Aggregate results
	const items: SyncItem[] = [];
	const errors: NotionSyncError[] = [];
	const stats = createStats();
	let maxEditedTime: string | null = null;

	stats.pagesVisited = pages.length;

	for (const result of results) {
		if (result.status === "success") {
			items.push(result.item);
			stats.pagesSynced += 1;
			stats.items += 1;
			stats.upserts += 1;
			maxEditedTime = pickLatestEditedTime(maxEditedTime, result.lastEditedTime);
		} else if (result.status === "skipped") {
			stats.pagesSkipped += 1;
			stats.skipped += 1;
		} else if (result.status === "error") {
			errors.push(result.error);
			stats.pagesSkipped += 1;
			stats.skipped += 1;
			if (result.fatal) {
				// Re-throw unauthorized errors with context preserved
				const fatalError = new Error(`Notion API unauthorized: ${result.error.message}`);
				fatalError.cause = result.error;
				throw fatalError;
			}
		}
	}

	return {
		items,
		errors,
		stats,
		nextCursor: resolveNextCursor(options.cursor, maxEditedTime),
	};
}

async function pageToSyncItem(
	notion: Client,
	page: PageObjectResponse,
	databaseId: string,
	request: NotionRequest,
	options: { pageSize: number; concurrency: number },
): Promise<SyncItem> {
	const blocks = await fetchBlocksWithChildren(notion, page.id, request, {
		pageSize: options.pageSize,
		concurrency: options.concurrency,
	});
	const markdown = blocksToMarkdown(blocks).trim();
	const normalized = normalizeForHash(markdown);
	const contentHash = sha256Hex(normalized);
	const title = extractPageTitle(page) || "Untitled";

	return {
		op: "upsert",
		externalId: page.id,
		title,
		contentMarkdown: markdown,
		contentHash,
		updatedAtSource: page.last_edited_time ?? null,
		deletedAtSource: null,
		metadata: {
			databaseId,
			url: page.url,
			propertiesSummary: summarizeProperties(page.properties),
		},
	};
}

/**
 * Fetch blocks using BFS with parallel sibling fetching for better performance.
 */
async function fetchBlocksWithChildren(
	notion: Client,
	blockId: string,
	request: NotionRequest,
	options: { pageSize: number; concurrency: number },
): Promise<NotionBlockWithChildren[]> {
	// Fetch top-level blocks
	const topBlocks = await fetchBlocksAtLevel(notion, blockId, request, options.pageSize);

	// BFS: process level by level with parallel children fetching
	let currentLevel = topBlocks;
	while (currentLevel.length > 0) {
		const blocksWithChildren = currentLevel.filter((b) => b.has_children);
		if (blocksWithChildren.length === 0) break;

		// Fetch all children in parallel (with concurrency limit)
		const pool = createConcurrencyPool(options.concurrency);
		const childPromises = blocksWithChildren.map(async (block) => {
			await pool.acquire();
			try {
				block.children = await fetchBlocksAtLevel(notion, block.id, request, options.pageSize);
			} finally {
				pool.release();
			}
		});

		await Promise.all(childPromises);

		// Next level = all children we just fetched
		currentLevel = blocksWithChildren.flatMap((b) => b.children ?? []);
	}

	return topBlocks;
}

/**
 * Fetch all blocks at a single level (no recursion).
 */
async function fetchBlocksAtLevel(
	notion: Client,
	blockId: string,
	request: NotionRequest,
	pageSize: number,
): Promise<NotionBlockWithChildren[]> {
	const list = (args: Parameters<Client["blocks"]["children"]["list"]>[0]) => request(() => notion.blocks.children.list(args));

	const iterator = iteratePaginatedAPI(list, {
		block_id: blockId,
		page_size: pageSize,
	});

	const blocks: NotionBlockWithChildren[] = [];
	for await (const block of iterator) {
		if (isFullBlock(block)) {
			blocks.push({ ...block });
		}
	}

	return blocks;
}

async function fetchFullPage(
	notion: Client,
	page: PageObjectResponse | PartialPageObjectResponse,
	request: NotionRequest,
): Promise<PageObjectResponse | null> {
	if (isFullPage(page)) {
		return page;
	}

	try {
		const fullPage = await request(() => notion.pages.retrieve({ page_id: page.id }));
		return isFullPage(fullPage) ? fullPage : null;
	} catch (error: unknown) {
		if (isNotionClientError(error) && error.code === APIErrorCode.ObjectNotFound) {
			return null;
		}
		throw error;
	}
}

function isFullPage(page: PageObjectResponse | PartialPageObjectResponse): page is PageObjectResponse {
	return "properties" in page;
}

function isFullBlock(block: BlockObjectResponse | PartialBlockObjectResponse): block is BlockObjectResponse {
	return "type" in block;
}

function extractPageTitle(page: PageObjectResponse): string {
	const titleProperty = Object.values(page.properties).find((property) => property.type === "title");

	if (!titleProperty || titleProperty.type !== "title") {
		return "";
	}

	return richTextToMarkdown(titleProperty.title).trim();
}

function summarizeProperties(properties: PageObjectResponse["properties"]): Record<string, unknown> {
	const summary: Record<string, unknown> = {};

	for (const [name, property] of Object.entries(properties)) {
		switch (property.type) {
			case "title":
				summary[name] = richTextToMarkdown(property.title).trim();
				break;
			case "rich_text":
				summary[name] = richTextToMarkdown(property.rich_text).trim();
				break;
			case "select":
				summary[name] = property.select?.name ?? null;
				break;
			case "multi_select":
				summary[name] = property.multi_select.map((item) => item.name);
				break;
			case "status":
				summary[name] = property.status?.name ?? null;
				break;
			case "number":
				summary[name] = property.number ?? null;
				break;
			case "checkbox":
				summary[name] = property.checkbox ?? false;
				break;
			case "date":
				summary[name] = property.date?.start ?? null;
				break;
			case "people":
				summary[name] = property.people.map((person) => ("name" in person ? person.name : person.id));
				break;
			case "files":
				summary[name] = property.files
					.map((file) => {
						if (file.type === "file") {
							return file.file.url;
						}
						if (file.type === "external") {
							return file.external.url;
						}
						return null;
					})
					.filter((value): value is string => Boolean(value));
				break;
			case "relation":
				summary[name] = property.relation.map((relation) => relation.id);
				break;
			case "url":
				summary[name] = property.url ?? null;
				break;
			case "email":
				summary[name] = property.email ?? null;
				break;
			case "phone_number":
				summary[name] = property.phone_number ?? null;
				break;
			case "created_time":
				summary[name] = property.created_time;
				break;
			case "last_edited_time":
				summary[name] = property.last_edited_time;
				break;
			case "created_by":
				summary[name] = property.created_by?.id ?? null;
				break;
			case "last_edited_by":
				summary[name] = property.last_edited_by?.id ?? null;
				break;
			default:
				summary[name] = property.type;
				break;
		}
	}

	return summary;
}

function toSyncError(error: unknown, pageId?: string): NotionSyncError {
	if (isNotionClientError(error)) {
		return {
			pageId,
			message: error.message,
			code: error.code,
		};
	}

	if (error instanceof Error) {
		return {
			pageId,
			message: error.message,
		};
	}

	return {
		pageId,
		message: "Unknown error",
	};
}

function createStats(): NotionSyncResult["stats"] {
	return {
		items: 0,
		upserts: 0,
		deletes: 0,
		skipped: 0,
		pagesVisited: 0,
		pagesSynced: 0,
		pagesSkipped: 0,
	};
}

function mergeStats(target: NotionSyncResult["stats"], source: NotionSyncResult["stats"]): void {
	target.items += source.items;
	target.upserts += source.upserts;
	target.deletes += source.deletes;
	target.skipped += source.skipped;
	target.pagesVisited += source.pagesVisited;
	target.pagesSynced += source.pagesSynced;
	target.pagesSkipped += source.pagesSkipped;
}

function pickLatestCursor(current: NotionSyncResult["nextCursor"], next: NotionSyncResult["nextCursor"]): NotionSyncResult["nextCursor"] {
	const currentTime = Date.parse(current.since);
	const nextTime = Date.parse(next.since);
	if (Number.isNaN(currentTime)) {
		return next;
	}
	if (Number.isNaN(nextTime)) {
		return current;
	}
	return nextTime > currentTime ? next : current;
}

function resolveNextCursor(cursor: NotionSyncOptions["cursor"], maxEditedTime: string | null): NotionSyncResult["nextCursor"] {
	if (maxEditedTime) {
		return { since: maxEditedTime };
	}
	if (cursor) {
		return cursor;
	}
	return { since: new Date().toISOString() };
}

function pickLatestEditedTime(current: string | null, candidate: string): string {
	if (!current) {
		return candidate;
	}
	const currentTime = Date.parse(current);
	const candidateTime = Date.parse(candidate);
	if (Number.isNaN(currentTime)) {
		return candidate;
	}
	if (Number.isNaN(candidateTime)) {
		return current;
	}
	return candidateTime > currentTime ? candidate : current;
}

function shiftIsoSeconds(iso: string, deltaSeconds: number): string {
	const date = new Date(iso);
	return new Date(date.getTime() + deltaSeconds * 1000).toISOString();
}

function isPageArchivedOrTrashed(page: PageObjectResponse): boolean {
	if (page.archived) {
		return true;
	}
	if ("in_trash" in page && page.in_trash) {
		return true;
	}
	return false;
}

export type { NotionBlockWithChildren, RichTextItemResponse };
