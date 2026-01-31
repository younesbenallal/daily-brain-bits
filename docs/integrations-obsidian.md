# Obsidian Integration (Plugin Push Sync)

## Summary

The Obsidian integration is a local-first sync: an Obsidian community plugin scans a vault and pushes batches of note changes (upserts/deletes) to the DBB backend. The plugin maintains a local index keyed by a stable `externalId` and uses normalized SHA-256 hashing to avoid re-uploading unchanged files. The backend applies conflict resolution and may skip stale items.

**Sync model**: Periodic sync (daily/weekly/manual) — the plugin computes a diff at sync time by comparing current vault state against the local index. No real-time event listeners.

## Scope

- In scope:
  - Obsidian plugin periodic sync (daily/weekly/manual)
  - Diff-based change detection (new, modified, deleted files)
  - Glob-based include/exclude filtering in the plugin for note selection
  - Batch upload protocol (`SyncBatchRequest`) and backend ingestion endpoint
- Out of scope:
  - Better Auth integration / token validation (intentionally deferred)
  - Attachments content sync (ignored for now)

## Main Files

| Path | Responsibility |
|------|----------------|
| `apps/obsidian-plugin/src/main.ts` | Plugin entrypoint; loads settings/index, registers commands, triggers sync on startup if interval passed. |
| `apps/obsidian-plugin/src/diff.ts` | Core diff logic: `computeSyncDiff()` compares vault vs index; `shouldSyncNow()` checks if sync interval passed. |
| `apps/obsidian-plugin/src/diff.test.ts` | Unit tests for diff logic (16 test cases). |
| `apps/obsidian-plugin/src/settings.ts` | Settings schema, defaults, UI, normalization. Includes `syncInterval` setting. |
| `apps/obsidian-plugin/src/syncer.ts` | Orchestrates sync: gets vault files, computes diff, delegates to SyncOperations. |
| `apps/obsidian-plugin/src/sync-operations.ts` | Builds sync items from diff, sends batches, updates index based on response. |
| `apps/obsidian-plugin/src/storage.ts` | Persists plugin settings + local index via `loadData()` / `saveData()`. Handles migration from old format. |
| `packages/integrations/obsidian/src/sync.ts` | Zod schemas for `SyncBatchRequest` / `SyncBatchResponse` and register response. |
| `packages/integrations/obsidian/src/ids.ts` | `externalId` helper: `"<vaultId>::<normalizedPath>"`. |
| `packages/integrations/obsidian/src/filters.ts` | Simple glob matcher used by plugin scope filtering. |
| `apps/back/src/routes/obsidian.ts` | Backend endpoints for `/register` and `/sync/batch` that upsert into `documents`. |
| `apps/back/src/integrations/sync-pipeline.ts` | Shared backend pipeline (conflict resolution + ingest). |
| `packages/db/src/schema/index.ts` | Tables and enums (Drizzle schema). |
| `packages/db/src/schema/models.ts` | Types inferred from the Drizzle schema (rows + inserts). |
| `apps/front/src/lib/obsidian-content.ts` | Obsidian note content normalization (frontmatter + dataview stripping) and wiki link parsing. |
| `apps/front/src/routes/(app)/dash.tsx` | Digest note rendering; applies Obsidian-specific parsing and deep-link rendering. |

## Main Flows

### Periodic sync (how it works)

1. **On Obsidian startup**: Plugin checks `shouldSyncNow(lastSyncAt, syncInterval)`:
   - If interval has passed (or never synced), triggers sync automatically
   - If not, does nothing until user manually triggers or next startup

2. **Sync execution** (`fullSync()`):
   - Get current vault files with their `mtime` (modification timestamp)
   - Compute diff by comparing vault state vs local index:
     - **NEW**: file in vault but not in index → upsert
     - **MODIFIED**: file.mtime > index.lastSyncedAt → upsert
     - **DELETED**: file in index but not in vault → delete
     - **UNCHANGED**: file in both, mtime <= lastSyncedAt → skip
   - Send batches to backend
   - Update index based on response (only for accepted items)
   - Update `lastSyncAt` timestamp

3. **Content hash optimization**: Even if mtime changed, if `contentHash` is identical, the file is skipped (avoids re-uploading when only metadata changed).

### Sync interval options

| Setting | Behavior |
|---------|----------|
| `daily` | Sync runs on startup if 24+ hours since last sync |
| `weekly` | Sync runs on startup if 7+ days since last sync |
| `manual` | Never auto-syncs; user must click "Sync now" |

### Batch upload protocol

Plugin → backend request (`SyncBatchRequest`):

- `vaultId`, `deviceId`, `sentAt`
- `items[]` of:
  - `op: "upsert"` with `externalId`, `path`, `title`, `contentMarkdown`, `contentHash`, `updatedAtSource`, `metadata`
  - `op: "delete"` with `externalId`, `path`

Backend response (`SyncBatchResponse`):

- `{ accepted, rejected, itemResults[] }` with per-item status (`accepted`, `rejected`, `skipped`).

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
    - `configJson`: vault metadata (device IDs, settings)
    - `secretsJsonEncrypted`: plugin token hash placeholder
- `documents`: canonical note records (content stored in `contentCiphertext` fields for now)
- `sync_state`: last sync timestamps (no cursor for Obsidian push)

### Local index structure

```ts
type FileIndexEntry = {
  path: string;
  contentHash: string;
  lastSyncedAt: number;  // timestamp ms when this file was synced
};

type LocalIndex = {
  files: Record<externalId, FileIndexEntry>;
  lastSyncAt: number | null;  // when we last ran ANY sync
};
```

## Frontend Note Rendering (Obsidian)

When digest notes come from Obsidian, the frontend applies Obsidian-specific parsing rules before rendering:

- Frontmatter blocks (`---`) are stripped from the visible content.
- Dataview code fences (```dataview / ```dataviewjs) are removed entirely.
- Wiki links (`[[...]]`) are rendered as deep links: `obsidian://open?vault=<vaultName>&file=<target>`.

These rules are applied only when `sourceKind === "obsidian"` and use the connection `displayName` (vault name) returned with digest items.

## External Constraints

- `metadataCache` may lag immediately after edits; metadata extraction should tolerate missing cache entries.
- File renames result in delete (old path) + create (new path) — review history is not preserved across renames.

## Dependencies

- Frontend: React + TanStack Router rendering for digest notes.
- Obsidian URL scheme: relies on the `obsidian://` deep-link protocol to open the local vault.

## Configuration

- Vault display name is sourced from the Obsidian plugin's `vaultName` and stored as `integration_connections.displayName`.
- Deep links use `vaultName` and the wiki link target to open notes via `obsidian://open`.

## Security

- **Plugin token**: Stored securely via Obsidian's SecretStorage API (introduced in Obsidian 1.11.4). The token is not saved in `data.json` — instead it uses the OS keychain (Keychain on macOS, Windows Credentials, etc.).
- Legacy tokens stored in settings are automatically migrated to SecretStorage on plugin load.



## Future Work

- Resolve wiki links to exact vault paths (including `#heading` and `^block` anchors).
- Render embedded links (`![[...]]`) and additional Obsidian markdown constructs.
- Consider stable note ID (frontmatter `id` field) to preserve history across renames.
