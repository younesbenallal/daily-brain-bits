import type { Client } from "@notionhq/client";
import type { IntegrationSyncAdapter } from "@daily-brain-bits/core";
import { createNotionRequest } from "./client";
import { syncDatabase } from "./sync";
import type { NotionRequest, NotionSyncOptions } from "./types";

export type NotionSyncScope = {
  databaseId: string;
};

export type NotionAdapterOptions = Omit<
  NotionSyncOptions,
  "cursor" | "request"
> & {
  request?: NotionRequest;
};

export function createNotionSyncAdapter(
  options: { notion: Client } & NotionAdapterOptions
): IntegrationSyncAdapter<NotionSyncScope> {
  const {
    notion,
    request: providedRequest,
    pageSize,
    safetyMarginSeconds,
    maxPages,
    onPage,
  } = options;
  const request = providedRequest ?? createNotionRequest();

  return {
    kind: "notion",
    async sync(scope, cursor) {
      const result = await syncDatabase(notion, scope.databaseId, {
        cursor,
        request,
        pageSize,
        safetyMarginSeconds,
        maxPages,
        onPage,
      });

      return {
        items: result.items,
        nextCursor: result.nextCursor,
        stats: result.stats,
      };
    },
  };
}
