import { APIErrorCode, isNotionClientError } from "@notionhq/client";
import { iteratePaginatedAPI, type Client } from "@notionhq/client";
import type {
  BlockObjectResponse,
  PageObjectResponse,
  PartialBlockObjectResponse,
  PartialPageObjectResponse,
  RichTextItemResponse,
} from "@notionhq/client/build/src/api-endpoints";
import { normalizeForHash, sha256Hex } from "@daily-brain-bits/core";
import { blocksToMarkdown, richTextToMarkdown } from "./markdown";
import { createNotionRequest } from "./client";
import type {
  NotionRequest,
  NotionSyncError,
  NotionSyncItem,
  NotionSyncOptions,
  NotionSyncResult,
} from "./types";
import type { NotionBlockWithChildren } from "./markdown";

const defaultPageSize = 100;
const defaultSafetyMarginMinutes = 5;

export async function syncDatabases(
  notion: Client,
  databaseIds: string[],
  options: NotionSyncOptions = {}
): Promise<NotionSyncResult> {
  const request = options.request ?? createNotionRequest();
  const aggregate: NotionSyncResult = {
    items: [],
    errors: [],
    stats: {
      pagesVisited: 0,
      pagesSynced: 0,
      pagesSkipped: 0,
    },
    stoppedEarly: false,
  };

  for (const databaseId of databaseIds) {
    const result = await syncDatabase(notion, databaseId, {
      ...options,
      request,
    });

    aggregate.items.push(...result.items);
    aggregate.errors.push(...result.errors);
    aggregate.stats.pagesVisited += result.stats.pagesVisited;
    aggregate.stats.pagesSynced += result.stats.pagesSynced;
    aggregate.stats.pagesSkipped += result.stats.pagesSkipped;
    aggregate.stoppedEarly = aggregate.stoppedEarly || result.stoppedEarly;
  }

  return aggregate;
}

export async function syncDatabase(
  notion: Client,
  databaseId: string,
  options: NotionSyncOptions = {}
): Promise<NotionSyncResult> {
  const request = options.request ?? createNotionRequest();
  const pageSize = options.pageSize ?? defaultPageSize;
  const safetyMarginMinutes =
    options.safetyMarginMinutes ?? defaultSafetyMarginMinutes;
  const since = options.since
    ? new Date(options.since.getTime() - safetyMarginMinutes * 60_000)
    : null;

  const items: NotionSyncItem[] = [];
  const errors: NotionSyncError[] = [];
  const stats = {
    pagesVisited: 0,
    pagesSynced: 0,
    pagesSkipped: 0,
  };
  let stoppedEarly = false;

  const query = (args: Parameters<Client["databases"]["query"]>[0]) =>
    request(() => notion.databases.query(args));

  const iterator = iteratePaginatedAPI(query, {
    database_id: databaseId,
    page_size: pageSize,
    sorts: [{ timestamp: "last_edited_time", direction: "descending" }],
  });

  for await (const page of iterator) {
    const pageId = page.id;
    stats.pagesVisited += 1;

    if (options.maxPages && stats.pagesVisited > options.maxPages) {
      stoppedEarly = true;
      break;
    }

    try {
      const fullPage = await ensureFullPage(notion, page, request);
      if (!fullPage) {
        stats.pagesSkipped += 1;
        continue;
      }

      const lastEditedAt = new Date(fullPage.last_edited_time);
      if (since && lastEditedAt <= since) {
        stoppedEarly = true;
        break;
      }

      options.onPage?.({
        databaseId,
        pageId,
        lastEditedAt: fullPage.last_edited_time,
      });

      const item = await pageToSyncItem(notion, fullPage, databaseId, request, {
        pageSize,
      });
      items.push(item);
      stats.pagesSynced += 1;
    } catch (error: unknown) {
      const syncError = toSyncError(error, pageId);
      errors.push(syncError);

      if (syncError.code === APIErrorCode.Unauthorized) {
        throw error;
      }
      stats.pagesSkipped += 1;
    }
  }

  return {
    items,
    errors,
    stats,
    stoppedEarly,
  };
}

async function pageToSyncItem(
  notion: Client,
  page: PageObjectResponse,
  databaseId: string,
  request: NotionRequest,
  options: { pageSize: number }
): Promise<NotionSyncItem> {
  const blocks = await fetchBlocksWithChildren(notion, page.id, request, {
    pageSize: options.pageSize,
  });
  const markdown = blocksToMarkdown(blocks).trim();
  const normalized = normalizeForHash(markdown);
  const contentHash = sha256Hex(normalized);
  const title = extractPageTitle(page) || "Untitled";

  return {
    externalId: page.id,
    title,
    contentMarkdown: markdown,
    contentHash,
    createdAtSource: page.created_time ?? null,
    updatedAtSource: page.last_edited_time ?? null,
    deletedAtSource: null,
    metadata: {
      databaseId,
      url: page.url,
      propertiesSummary: summarizeProperties(page.properties),
    },
  };
}

async function fetchBlocksWithChildren(
  notion: Client,
  blockId: string,
  request: NotionRequest,
  options: { pageSize: number }
): Promise<NotionBlockWithChildren[]> {
  const list = (args: Parameters<Client["blocks"]["children"]["list"]>[0]) =>
    request(() => notion.blocks.children.list(args));

  const iterator = iteratePaginatedAPI(list, {
    block_id: blockId,
    page_size: options.pageSize,
  });

  const blocks: NotionBlockWithChildren[] = [];

  for await (const block of iterator) {
    if (!isFullBlock(block)) {
      continue;
    }

    const enriched: NotionBlockWithChildren = { ...block };
    if (block.has_children) {
      enriched.children = await fetchBlocksWithChildren(
        notion,
        block.id,
        request,
        options
      );
    }

    blocks.push(enriched);
  }

  return blocks;
}

async function ensureFullPage(
  notion: Client,
  page: PageObjectResponse | PartialPageObjectResponse,
  request: NotionRequest
): Promise<PageObjectResponse | null> {
  if (isFullPage(page)) {
    return page;
  }

  try {
    const fullPage = await request(() =>
      notion.pages.retrieve({ page_id: page.id })
    );
    return isFullPage(fullPage) ? fullPage : null;
  } catch (error: unknown) {
    if (
      isNotionClientError(error) &&
      error.code === APIErrorCode.ObjectNotFound
    ) {
      return null;
    }
    throw error;
  }
}

function isFullPage(
  page: PageObjectResponse | PartialPageObjectResponse
): page is PageObjectResponse {
  return "properties" in page;
}

function isFullBlock(
  block: BlockObjectResponse | PartialBlockObjectResponse
): block is BlockObjectResponse {
  return "type" in block;
}

function extractPageTitle(page: PageObjectResponse): string {
  const titleProperty = Object.values(page.properties).find(
    (property) => property.type === "title"
  );

  if (!titleProperty || titleProperty.type !== "title") {
    return "";
  }

  return richTextToMarkdown(titleProperty.title).trim();
}

function summarizeProperties(
  properties: PageObjectResponse["properties"]
): Record<string, unknown> {
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
        summary[name] = property.people.map((person) => person.name || person.id);
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

export type { NotionBlockWithChildren, RichTextItemResponse };
