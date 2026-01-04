# Integration Architecture (Sync Adapters)

## Summary

Daily Brain Bits ingests “notes” from multiple sources (Notion, Obsidian) into a single normalized backend model. Each integration can have very different mechanics (pull vs push), but they converge through a shared sync contract and backend sync pipeline:

- Integrations produce a list of `SyncItem`s (`upsert`/`delete`) keyed by a stable `externalId`.
- The backend runs a shared pipeline (scope filtering → conflict resolution → upsert/tombstone) into `documents`.
  - For pull-based integrations (e.g. Notion), a `SyncCursor` is advanced so subsequent runs only process changes.
  - For push-based integrations (e.g. Obsidian), the plugin is responsible for batching changes and avoiding re-uploading unchanged files (via stable hashing + a local index).

## Scope

- In scope:
  - Shared sync contract (`SyncItem`, `SyncCursor`, `IntegrationSyncAdapter`)
  - Notion “pull” adapter producing `SyncItem[]` incrementally
  - Obsidian “push” payloads + mapping to the shared `SyncItem` shape
- Out of scope:
  - Better Auth / user auth flows
  - Notion OAuth + webhook ingestion endpoints (not implemented yet)
  - Worker scheduling orchestration (not implemented yet)

## Main Files

| Path | Responsibility |
|------|----------------|
| `packages/core/src/domain/document.ts` | Canonical normalized “Document” schema (what the backend stores). |
| `packages/core/src/hash.ts` | `normalizeForHash()` + `sha256Hex()` used to dedupe and skip unchanged content. |
| `packages/core/src/integrations/sync.ts` | Shared integration contract: `SyncItem`, `SyncCursor`, `IntegrationSyncAdapter`. |
| `packages/integrations/notion/src/adapter.ts` | Notion adapter implementing the shared contract (`createNotionSyncAdapter`). |
| `packages/integrations/notion/src/sync.ts` | Notion incremental database sync using `last_edited_time` filtering. |
| `packages/integrations/obsidian/src/sync.ts` | Obsidian batch request/response schemas for plugin → backend sync. |
| `packages/integrations/obsidian/src/adapter.ts` | Maps Obsidian `SyncItem` into core `SyncItem`. |
| `apps/back/src/integrations/sync-pipeline.ts` | Shared backend pipeline: scope filter + conflict resolution + ingest. |
| `apps/back/src/routes/obsidian.ts` | Server endpoint implementation that receives plugin batches and upserts into `documents`. |
| `apps/obsidian/src/main.ts` | Obsidian plugin entrypoint (settings, commands, event listeners, sync kickoff). |
| `apps/obsidian/src/syncer.ts` | Full scan + incremental queueing + batched uploads with retries/backoff. |
| `apps/obsidian/src/settings.ts` | Plugin settings UI + settings normalization. |
| `packages/db/src/schema/index.ts` | DB tables for connections, scope items, documents, and sync state. |

## Main Flows

### Notion (pull) → core `SyncItem[]` → DB upsert

1. A worker calls the Notion adapter `sync({ databaseId }, cursor?)`.
2. The adapter queries only pages edited since the cursor’s `since` timestamp (with a safety margin).
3. For each changed page:
   - fetch blocks recursively
   - convert blocks to Markdown
   - normalize + hash
   - emit `SyncItem` with `op: "upsert"`, `externalId: page.id`, `updatedAtSource: page.last_edited_time`
4. The worker upserts the returned `SyncItem[]` into `documents` and stores `nextCursor`.

### Obsidian (push) → backend route → DB upsert

1. The Obsidian plugin (`apps/obsidian`) batches file changes and POSTs a `SyncBatchRequest` to the backend.
2. The backend runs the shared pipeline:
   - Scope filter (server-side)
   - Conflict resolution (newer source timestamp wins; stale items are skipped)
   - Upsert/tombstone into `documents`
3. The backend updates `sync_state.lastIncrementalSyncAt` and connection “last seen” timestamps.

## Data Model / DB

Minimum viable integration storage lives in `packages/db/src/schema/index.ts`:

- `integration_connections`: one connection per user/source/account (e.g. Notion workspace or Obsidian vault).
- `integration_scope_items`: user-selected scope items (e.g. `notion_database` IDs, `obsidian_glob` patterns).
- `documents`: normalized storage for note content; uniqueness enforced by `(userId, connectionId, externalId)`.
- `sync_state`: per-connection state such as last sync timestamps and cursor JSON.

## Notes / TODOs

- Auth is intentionally not implemented yet (Better Auth will own it). The Obsidian routes currently accept `userId` on register and do not validate the plugin token on `/sync/batch`.
- `SyncCursor` is now integration-specific JSON; Notion uses `{ since }` while push integrations may omit it.

## External Constraints

- Notion API:
  - Rate-limited; callers must handle `429 RateLimited` and respect `Retry-After`.
  - Most list endpoints are paginated; callers should use paginated iteration.
  - Webhooks can be used as a trigger signal (optional); event payloads do not include full content.
- Obsidian:
  - High-frequency local file events; batching + debounce is required in the plugin.

## Testing / Verification

- Notion adapter self-test (initial sync → mutate page → incremental sync):
  - `NOTION_API_KEY=... NOTION_DATABASE_ID=... bun packages/integrations/notion/scripts/test-sync.ts`
- Notion `last_edited_time` filter test:
  - `NOTION_API_KEY=... NOTION_DATABASE_ID=... bun packages/integrations/notion/scripts/test-last-edited.ts`
