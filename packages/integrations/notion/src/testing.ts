import type { Client } from "@notionhq/client";
import { createNotionRequest } from "./client";
import { createNotionSyncAdapter } from "./adapter";

export type SelfTestResult = {
	pageId: string;
	initialCursor: string;
	initialItems: number;
	incrementalItems: number;
	returnedPageIds: string[];
	missingPageIds: string[];
	extraPageIds: string[];
};

export type LastEditedTestResult = {
	baselineIso: string;
	filterAfterIso: string;
	expectedPageIds: string[];
	returnedPageIds: string[];
	missingPageIds: string[];
	extraPageIds: string[];
	pageEditTimes: Array<{ pageId: string; lastEditedTime: string }>;
};

export async function runNotionSelfTest(options: {
	notion: Client;
	databaseId: string;
	log?: (message: string) => void;
	delayMs?: number;
}): Promise<SelfTestResult> {
	const log = options.log ?? (() => {});
	const delayMs = options.delayMs ?? 1500;
	const { notion, databaseId } = options;
	const request = createNotionRequest();
	const adapter = createNotionSyncAdapter({
		notion,
		request,
		safetyMarginSeconds: 0,
	});

	log("Running Notion self-test: initial sync.");
	const initial = await adapter.sync({ databaseId });
	const cursor = initial.nextCursor;

	await sleep(delayMs);

	const titleProp = await resolveTitleProperty(notion, databaseId, request);
	if (!titleProp) {
		throw new Error("Could not identify the title property for the database.");
	}

	log("Creating and updating a test page.");
	const page = await request(() =>
		notion.pages.create({
			parent: { database_id: databaseId },
			properties: {
				[titleProp]: {
					title: [{ text: { content: `DBB Adapter Test ${new Date().toISOString()}` } }],
				},
			},
		}),
	);

	await request(() =>
		notion.blocks.children.append({
			block_id: page.id,
			children: [
				{
					object: "block",
					type: "paragraph",
					paragraph: {
						rich_text: [{ type: "text", text: { content: "Adapter test content." } }],
					},
				},
			],
		}),
	);

	if (delayMs > 0) {
		await sleep(delayMs);
	}

	const incremental = await adapter.sync({ databaseId }, cursor);
	const returnedPageIds = incremental.items.map((item) => item.externalId);
	const returnedSet = new Set(returnedPageIds);
	const missingPageIds = returnedSet.has(page.id) ? [] : [page.id];
	const extraPageIds = returnedPageIds.filter((id) => id !== page.id);

	await request(() =>
		notion.pages.update({
			page_id: page.id,
			archived: true,
		}),
	);

	return {
		pageId: page.id,
		initialCursor: cursor.since,
		initialItems: initial.items.length,
		incrementalItems: incremental.items.length,
		returnedPageIds,
		missingPageIds,
		extraPageIds,
	};
}

export async function runNotionLastEditedTimeTest(options: {
	notion: Client;
	databaseId: string;
	log?: (message: string) => void;
	delayMs?: number;
	archiveAfter?: boolean;
}): Promise<LastEditedTestResult> {
	const log = options.log ?? (() => {});
	const request = createNotionRequest();
	const delayMs = options.delayMs ?? 1500;
	const archiveAfter = options.archiveAfter ?? true;

	const { notion, databaseId } = options;
	const titleProp = await resolveTitleProperty(notion, databaseId, request);
	if (!titleProp) {
		throw new Error("Could not identify the title property for the database.");
	}

	log("Creating test pages...");
	const pageIds: string[] = [];
	const createdEditedTimes: string[] = [];
	for (let i = 0; i < 2; i += 1) {
		const page = await request(() =>
			notion.pages.create({
				parent: { database_id: databaseId },
				properties: {
					[titleProp]: {
						title: [{ text: { content: `DBB Last Edited Test ${i + 1}` } }],
					},
				},
			}),
		);
		pageIds.push(page.id);
		if ("last_edited_time" in page) {
			createdEditedTimes.push(page.last_edited_time);
		}
	}

	const baselineIso = createdEditedTimes.sort().at(-1) ?? new Date().toISOString();
	const filterAfterIso = shiftIsoSeconds(baselineIso, -2);
	log(`Baseline: ${baselineIso}`);

	await sleep(1000);

	log("Updating pages to bump last_edited_time...");
	for (const pageId of pageIds) {
		await request(() =>
			notion.blocks.children.append({
				block_id: pageId,
				children: [
					{
						object: "block",
						type: "paragraph",
						paragraph: {
							rich_text: [
								{
									type: "text",
									text: { content: `Updated at ${new Date().toISOString()}` },
								},
							],
						},
					},
				],
			}),
		);
	}

	if (delayMs > 0) {
		await sleep(delayMs);
	}

	const pageEditTimes: Array<{ pageId: string; lastEditedTime: string }> = [];
	for (const pageId of pageIds) {
		const page = await request(() => notion.pages.retrieve({ page_id: pageId }));
		if ("last_edited_time" in page) {
			pageEditTimes.push({ pageId, lastEditedTime: page.last_edited_time });
		}
	}

	const returnedPageIds = await queryPagesEditedAfter(notion, databaseId, filterAfterIso, request);

	const returnedSet = new Set(returnedPageIds);
	const expectedSet = new Set(pageIds);
	const missingPageIds = pageIds.filter((id) => !returnedSet.has(id));
	const extraPageIds = returnedPageIds.filter((id) => !expectedSet.has(id));

	if (archiveAfter) {
		log("Archiving test pages...");
		for (const pageId of pageIds) {
			await request(() =>
				notion.pages.update({
					page_id: pageId,
					archived: true,
				}),
			);
		}
	}

	return {
		baselineIso,
		filterAfterIso,
		expectedPageIds: pageIds,
		returnedPageIds,
		missingPageIds,
		extraPageIds,
		pageEditTimes,
	};
}

async function resolveTitleProperty(notion: Client, databaseId: string, request: <T>(fn: () => Promise<T>) => Promise<T>): Promise<string | null> {
	const database = await request(() =>
		notion.databases.retrieve({
			database_id: databaseId,
		}),
	);

	for (const [name, property] of Object.entries(database.properties)) {
		if (property.type === "title") {
			return name;
		}
	}

	return null;
}

async function queryPagesEditedAfter(
	notion: Client,
	databaseId: string,
	afterIso: string,
	request: <T>(fn: () => Promise<T>) => Promise<T>,
): Promise<string[]> {
	const response = await request(() =>
		notion.databases.query({
			database_id: databaseId,
			filter: {
				timestamp: "last_edited_time",
				last_edited_time: {
					after: afterIso,
				},
			},
		}),
	);

	return response.results.map((item) => item.id);
}

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => {
		setTimeout(resolve, ms);
	});
}

function shiftIsoSeconds(iso: string, deltaSeconds: number): string {
	const date = new Date(iso);
	return new Date(date.getTime() + deltaSeconds * 1000).toISOString();
}
