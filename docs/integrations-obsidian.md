# Obsidian Integration (Plugin Push Sync)

## Summary

The Obsidian integration is a local-first sync: an Obsidian community plugin scans a vault and pushes batches of note changes (upserts/deletes) to the DBB backend. The plugin maintains a local index keyed by a stable `externalId` and uses normalized SHA-256 hashing to avoid re-uploading unchanged files.

## Scope

- In scope:
  - Obsidian plugin full scan + incremental sync via vault events
  - Glob-based include/exclude filtering for note selection
  - Batch upload protocol (`SyncBatchRequest`) and backend ingestion endpoint
- Out of scope:
  - Better Auth integration / token validation (intentionally deferred)
  - Attachments content sync (ignored for now)

## Main Files

| Path | Responsibility |
|------|----------------|
| `apps/obsidian/src/main.ts` | Plugin entrypoint; loads settings/index, registers commands and vault listeners, triggers sync. |
| `apps/obsidian/src/settings.ts` | Settings schema, defaults, UI, normalization. |
| `apps/obsidian/src/syncer.ts` | Full scan, change queue, debounced flush, batch building, HTTP retries/backoff. |
| `apps/obsidian/src/storage.ts` | Persists plugin settings + local index via `loadData()` / `saveData()`. |
| `packages/integrations/obsidian/src/sync.ts` | Zod schemas for `SyncBatchRequest` / `SyncBatchResponse` and register response. |
| `packages/integrations/obsidian/src/ids.ts` | `externalId` helper: `"<vaultId>::<normalizedPath>"`. |
| `packages/integrations/obsidian/src/filters.ts` | Simple glob matcher used by plugin scope filtering. |
| `apps/back/src/routes/obsidian.ts` | Backend endpoints for `/register` and `/sync/batch` that upsert into `documents`. |
| `packages/db/src/schema/index.ts` | `integration_connections`, `obsidian_vaults`, `documents`, `sync_state`. |

## Main Flows

### Full scan (initial + manual)

1. Enumerate all Markdown files in the vault (`app.vault.getMarkdownFiles()`).
2. Apply scope filter (include folders, exclude folders, exclude patterns).
3. For each eligible file:
   - Read markdown (`vault.cachedRead(file)`)
   - Compute `contentHash = sha256Hex(normalizeForHash(markdown))`
   - Compare against local index; enqueue `upsert` only if new/changed
4. Flush the queue in batches to the backend.

### Incremental sync (vault events)

The plugin listens to vault events and enqueues work:

- `create` / `modify` → enqueue `upsert`
- `delete` → enqueue `delete`
- `rename` → enqueue `delete` (old path) + `upsert` (new path)

Uploads are debounced (default `2000ms`) to batch bursts of edits.

### Batch upload protocol

Plugin → backend request (`SyncBatchRequest`):

- `vaultId`, `deviceId`, `sentAt`
- `items[]` of:
  - `op: "upsert"` with `externalId`, `path`, `title`, `contentMarkdown`, `contentHash`, `updatedAtSource`, `metadata`
  - `op: "delete"` with `externalId`, `path`

Backend response (`SyncBatchResponse`):

- `{ accepted, rejected, itemResults[] }` with per-item acceptance/rejection.

### Retries / backoff

The plugin retries on transient failures:

- `429` / `503`: uses `Retry-After` when present, else exponential backoff (capped).
- `401`: shows a user-facing notice to reconnect (token invalid).

## Data Model / DB

- Identifiers and uniqueness:
  - `externalId` is stable: `"<vaultId>::<normalizedPath>"`
  - Backend uniqueness is enforced by `(userId, connectionId, externalId)` in `documents`.
- Tables (current MVP):
  - `integration_connections`: connection record for the vault (`kind: "obsidian"`, `accountExternalId = vaultId`)
  - `obsidian_vaults`: vault metadata, token hash placeholder, last seen timestamps
  - `documents`: canonical note records (content stored in `contentCiphertext` fields for now)
  - `sync_state`: last sync timestamps (no cursor for Obsidian push)

## External Constraints

- Obsidian can generate high-frequency local file events; batching + debounce is required.
- `metadataCache` may lag immediately after edits; metadata extraction should tolerate missing cache entries.

## Testing / Verification

- Build plugin bundle:
  - `cd apps/obsidian && bun run build`
- Run backend:
  - `bun --cwd apps/back dev`
- Manual smoke test:
  - Install/copy plugin output into a dev vault at `.obsidian/plugins/daily-brain-bits/` (with `manifest.json` + `main.js`).
  - Configure settings (API base URL, vault/device IDs).
  - Run `DBB: Sync now` from the command palette and verify backend receives `/v1/integrations/obsidian/sync/batch`.

