# Notion Integration (Incremental Database Sync)

## Summary

The Notion integration pulls pages from a user-selected list of Notion databases and converts each page to normalized Markdown. It is incremental: after an initial run, subsequent runs query only pages whose `last_edited_time` is newer than the stored `SyncCursor.since` timestamp.

This integration currently focuses on “database sync”. OAuth, webhook ingestion, and worker orchestration are intentionally not implemented yet.

## Scope

- In scope:
  - Incremental sync per database ID (cursor-based)
  - Pagination and rate-limit handling (retry on `429` with `Retry-After`)
  - Notion block tree → Markdown conversion (MVP set of blocks)
  - Emitting core `SyncItem` objects via a shared adapter contract
- Out of scope:
  - Notion OAuth (token acquisition/storage)
  - Webhook subscription + event handling
  - Producing `delete` items (archived/in_trash pages are currently skipped)

## Main Files

| Path | Responsibility |
|------|----------------|
| `packages/integrations/notion/src/adapter.ts` | `createNotionSyncAdapter()` implementing `IntegrationSyncAdapter`. |
| `packages/integrations/notion/src/sync.ts` | `syncDatabase()` / `syncDatabases()` that query Notion incrementally and convert pages into `SyncItem`s. |
| `packages/integrations/notion/src/client.ts` | `createNotionRequest()` wrapper for throttling + retry/backoff. |
| `packages/integrations/notion/src/markdown.ts` | Block + rich-text → Markdown conversion (MVP coverage + placeholders). |
| `packages/integrations/notion/src/testing.ts` | Test helpers used by scripts (self-test + last_edited_time test). |
| `packages/integrations/notion/scripts/test-sync.ts` | Thin runner for adapter self-test. |
| `packages/integrations/notion/scripts/test-last-edited.ts` | Thin runner that validates timestamp filtering with live mutations. |
| `packages/core/src/integrations/sync.ts` | Shared sync types (`SyncItem`, `SyncCursor`, `IntegrationSyncAdapter`). |

## Main Flows

### Adapter sync (per database)

1. Create adapter:
   - `createNotionSyncAdapter({ notion, ... })`
2. Sync:
   - `adapter.sync({ databaseId }, cursor?)` returns `{ items, nextCursor, stats }`

### Incremental query strategy

The sync engine uses `databases.query` with:

- Sort: `{ timestamp: "last_edited_time", direction: "descending" }`
- Optional filter (only when a cursor is present):
  - `timestamp: "last_edited_time"`
  - `last_edited_time.after: cursor.since - safetyMarginSeconds`

The safety margin exists to reduce “same-second” edge cases (Notion timestamps can be second-granularity depending on the mutation).

### Page processing → `SyncItem`

For each page returned by the database query:

1. Ensure a full page object (fallback to `pages.retrieve` when needed).
2. Skip pages that are `archived` (and `in_trash` when present).
3. Fetch all blocks recursively via `blocks.children.list` (paginated).
4. Convert blocks to Markdown (`markdown.ts`).
5. Normalize and hash:
   - `normalizeForHash(markdown)` → `sha256Hex()`
6. Emit a core `SyncItem`:
   - `op: "upsert"`
   - `externalId: page.id`
   - `updatedAtSource: page.last_edited_time`
   - `metadata` includes `databaseId`, `url`, and a `propertiesSummary`.

### Cursor advancement

Each sync run returns `nextCursor.since` equal to the maximum `last_edited_time` observed in the processed pages. If no pages were processed:

- If a cursor was provided: `nextCursor` remains unchanged.
- Otherwise: it uses “now” as the initial cursor value.

## External Constraints

- Rate limiting:
  - Notion may return `429 RateLimited` and a `Retry-After` header.
  - `createNotionRequest()` throttles requests and retries on `429`, respecting `Retry-After` when present.
- Pagination:
  - Both `databases.query` and `blocks.children.list` require pagination; the sync uses `iteratePaginatedAPI`.
- Webhooks (optional trigger):
  - Notion webhooks are event signals; they do not include the full updated content. A webhook handler still needs to retrieve the page/blocks via the API.

## Testing / Verification

- Adapter self-test:
  - `NOTION_API_KEY=... NOTION_DATABASE_ID=... bun packages/integrations/notion/scripts/test-sync.ts`
  - Behavior: initial sync → create/update a page → incremental sync should return only that page.
- Timestamp filtering test:
  - `NOTION_API_KEY=... NOTION_DATABASE_ID=... bun packages/integrations/notion/scripts/test-last-edited.ts`

