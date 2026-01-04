import type { Client } from "@notionhq/client";
import { createNotionRequest } from "./client";
import { syncDatabase } from "./sync";

type SnapshotItem = {
  externalId: string;
  title: string;
  contentHash: string;
  updatedAtSource: string | null;
};

type Snapshot = {
  databaseId: string;
  capturedAt: string;
  items: SnapshotItem[];
};

export type SelfTestResult = {
  pageId: string;
  added: SnapshotItem[];
  updated: SnapshotItem[];
  removed: SnapshotItem[];
  beforeCount: number;
  afterCount: number;
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
}): Promise<SelfTestResult> {
  const log = options.log ?? (() => {});
  const { notion, databaseId } = options;
  const request = createNotionRequest();

  log("Running Notion self-test: create/update/archive a test page.");
  const titleProp = await resolveTitleProperty(notion, databaseId, request);
  if (!titleProp) {
    throw new Error("Could not identify the title property for the database.");
  }

  const page = await request(() =>
    notion.pages.create({
      parent: { database_id: databaseId },
      properties: {
        [titleProp]: {
          title: [
            { text: { content: `DBB Sync Test ${new Date().toISOString()}` } },
          ],
        },
      },
    })
  );

  await request(() =>
    notion.blocks.children.append({
      block_id: page.id,
      children: [
        {
          object: "block",
          type: "paragraph",
          paragraph: {
            rich_text: [{ type: "text", text: { content: "Initial content." } }],
          },
        },
      ],
    })
  );

  const before = await takeSnapshot(notion, databaseId, log);

  await request(() =>
    notion.blocks.children.append({
      block_id: page.id,
      children: [
        {
          object: "block",
          type: "paragraph",
          paragraph: {
            rich_text: [{ type: "text", text: { content: "Updated content." } }],
          },
        },
      ],
    })
  );

  await request(() =>
    notion.pages.update({
      page_id: page.id,
      archived: true,
    })
  );

  const after = await takeSnapshot(notion, databaseId, log);
  const diff = compareSnapshots(before, after);

  return {
    pageId: page.id,
    added: diff.added,
    updated: diff.updated,
    removed: diff.removed,
    beforeCount: before.items.length,
    afterCount: after.items.length,
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
            title: [
              { text: { content: `DBB Last Edited Test ${i + 1}` } },
            ],
          },
        },
      })
    );
    pageIds.push(page.id);
    if ("last_edited_time" in page) {
      createdEditedTimes.push(page.last_edited_time);
    }
  }

  const baselineIso =
    createdEditedTimes.sort().at(-1) ?? new Date().toISOString();
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
      })
    );
  }

  if (delayMs > 0) {
    await sleep(delayMs);
  }

  const pageEditTimes: Array<{ pageId: string; lastEditedTime: string }> = [];
  for (const pageId of pageIds) {
    const page = await request(() =>
      notion.pages.retrieve({ page_id: pageId })
    );
    if ("last_edited_time" in page) {
      pageEditTimes.push({ pageId, lastEditedTime: page.last_edited_time });
    }
  }

  const returnedPageIds = await queryPagesEditedAfter(
    notion,
    databaseId,
    filterAfterIso,
    request
  );

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
        })
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

async function takeSnapshot(
  notion: Client,
  databaseId: string,
  log: (message: string) => void
): Promise<Snapshot> {
  const result = await syncDatabase(notion, databaseId, {
    onPage: (progress) => {
      if (progress.pageId) {
        log(`Fetched ${progress.pageId}`);
      }
    },
  });

  return {
    databaseId,
    capturedAt: new Date().toISOString(),
    items: result.items.map((item) => ({
      externalId: item.externalId,
      title: item.title,
      contentHash: item.contentHash,
      updatedAtSource: item.updatedAtSource,
    })),
  };
}

async function resolveTitleProperty(
  notion: Client,
  databaseId: string,
  request: <T>(fn: () => Promise<T>) => Promise<T>
): Promise<string | null> {
  const database = await request(() =>
    notion.databases.retrieve({
      database_id: databaseId,
    })
  );

  for (const [name, property] of Object.entries(database.properties)) {
    if (property.type === "title") {
      return name;
    }
  }

  return null;
}

function compareSnapshots(previous: Snapshot, current: Snapshot) {
  const previousMap = new Map(
    previous.items.map((item) => [item.externalId, item])
  );
  const currentMap = new Map(
    current.items.map((item) => [item.externalId, item])
  );

  const added: SnapshotItem[] = [];
  const updated: SnapshotItem[] = [];
  const removed: SnapshotItem[] = [];

  for (const [externalId, item] of currentMap) {
    const prev = previousMap.get(externalId);
    if (!prev) {
      added.push(item);
      continue;
    }
    if (prev.contentHash !== item.contentHash) {
      updated.push(item);
    }
  }

  for (const [externalId, item] of previousMap) {
    if (!currentMap.has(externalId)) {
      removed.push(item);
    }
  }

  return { added, updated, removed };
}

async function queryPagesEditedAfter(
  notion: Client,
  databaseId: string,
  afterIso: string,
  request: <T>(fn: () => Promise<T>) => Promise<T>
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
    })
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
