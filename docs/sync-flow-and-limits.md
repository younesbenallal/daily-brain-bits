# Sync Flow and Limits

This document describes how note syncing works for both integrations, how plan limits are enforced, and what happens during plan upgrades.

## Overview

| Integration | Sync Model | Trigger | Scheduled Sync |
|-------------|------------|---------|----------------|
| **Notion** | Pull (backend fetches from Notion API) | Manual ("Sync Now" in Settings) | Weekly (Sunday 3 AM UTC) |
| **Obsidian** | Push (plugin sends to backend) | Plugin events + manual | Plugin handles |

## Sync Flow by Integration

### Notion

1. User connects Notion via OAuth (handled by Better Auth)
2. User selects databases to sync in onboarding or Settings
3. Sync happens via:
   - Manual "Sync Now" button in Settings
   - Weekly scheduled sync (every Sunday at 3 AM UTC)
4. Backend fetches pages from selected databases via Notion API
5. Backend uses cursor-based incremental sync (`last_edited_time`) - only fetches pages modified since last sync
6. Items are ingested via `runSyncPipeline` → `ingestSyncItems`

**Key files:**
- [apps/back/routes/notion.ts](../apps/back/routes/notion.ts) - `syncNow` endpoint
- [apps/back/domains/notion/sync-connection.ts](../apps/back/domains/notion/sync-connection.ts) - Core sync function
- [apps/back/scripts/sync-notion-connections.ts](../apps/back/scripts/sync-notion-connections.ts) - Scheduled sync script
- [apps/trigger/src/tasks/notion-sync-weekly.ts](../apps/trigger/src/tasks/notion-sync-weekly.ts) - Trigger.dev weekly task
- [packages/integrations/notion/src/sync.ts](../packages/integrations/notion/src/sync.ts) - Notion adapter

### Obsidian

1. User generates API key in web app
2. User configures plugin with API key and vault settings
3. Plugin listens to vault events (create, modify, delete, rename)
4. Plugin batches changes and pushes to backend
5. Manual "Sync Now" command triggers full vault scan
6. Backend ingests items via `runSyncPipeline` → `ingestSyncItems`

**Key files:**
- [apps/obsidian-plugin/src/syncer.ts](../apps/obsidian-plugin/src/syncer.ts) - Plugin sync orchestration
- [apps/obsidian-plugin/src/sync-operations.ts](../apps/obsidian-plugin/src/sync-operations.ts) - Batch building and result handling
- [apps/back/routes/obsidian.ts](../apps/back/routes/obsidian.ts) - Backend endpoints

## Limit Enforcement

Limits are defined in [packages/core/src/plans.ts](../packages/core/src/plans.ts):

| Plan | Max Notes | Max Sources |
|------|-----------|-------------|
| Free | 500 | 1 |
| Pro | 10,000 | Unlimited |
| Self-Hosted | Unlimited | Unlimited |

### Where Limits Are Enforced

Limits are enforced **server-side** during ingestion in [apps/back/integrations/ingest.ts](../apps/back/integrations/ingest.ts):

```typescript
// Phase 3: Check entitlements for note limits
const entitlements = await getUserEntitlements(userId);
const noteLimit = entitlements.limits.maxNotes;
let remainingSlots = Number.POSITIVE_INFINITY;
if (noteLimit !== Number.POSITIVE_INFINITY) {
    const currentCount = await countUserDocuments(userId);
    remainingSlots = Math.max(0, noteLimit - currentCount);
}

// Later, for each new note:
if (isNew && remainingSlots <= 0) {
    rejected += 1;
    itemResults.push({
        externalId: upsert.externalId,
        status: "rejected",
        reason: "note_limit_reached",
    });
    continue;
}
```

### Sync Behavior at Limit

When a user syncs and hits their limit:

1. **All notes are sent** from the client (Notion adapter or Obsidian plugin)
2. **Backend accepts up to the limit**, rejects the rest with `note_limit_reached`
3. **Response includes per-item status**: `accepted`, `rejected`, or `skipped`

This "sync all, reject at limit" approach means:
- Simple implementation
- No client-side limit awareness needed
- Users see rejected count in sync results

## Upgrade Flow

### What Happens When a User Upgrades to Pro

1. User completes checkout via Polar
2. Subscription webhook updates `billing_subscriptions` table
3. `getUserPlan()` now returns `"pro"` for this user
4. **No automatic sync is triggered**

### Re-syncing After Upgrade

#### Notion
- User must manually click "Sync Now" in Settings
- Backend re-fetches from Notion API using stored cursor
- Previously rejected notes (if still in Notion) will be accepted

#### Obsidian
- User must trigger "Sync Now" from the plugin, OR
- Wait for file changes to trigger incremental sync
- **Key behavior**: Rejected notes are NOT added to local index

### Why Obsidian Re-sync Works

In [apps/obsidian-plugin/src/sync-operations.ts](../apps/obsidian-plugin/src/sync-operations.ts), the `applyBatchResult` method:

```typescript
// All items are dropped from queue
const queueKeys = new Set(batch.queueItems.map((item) => toQueueKey(item)));
this.queueManager.dropQueueItems(queueKeys);

// Only ACCEPTED items are added to local index
for (const result of response.itemResults) {
    if (!item || result.status !== "accepted") {
        continue;  // Rejected items are NOT indexed
    }
    this.index.files[item.externalId] = { ... };
}
```

On next `fullSync`, the plugin checks:

```typescript
const entry = this.index.files[externalId];
if (entry?.lastSeenMtime === file.stat.mtime) {
    continue;  // Skip only if in index
}
// Rejected notes (not in index) will be re-queued
```

**Result**: Previously rejected notes will be re-synced on manual "Sync Now".

## Current Gaps

### No Upgrade Notification

Users aren't notified to re-sync after upgrading. Options:
1. Show banner in Settings after upgrade
2. Auto-trigger sync on subscription webhook (Notion only)
3. Document expected behavior

## Downgrade Handling

When a Pro user downgrades to Free:

1. **Existing notes are preserved** (no deletion)
2. **New syncs are blocked** until under limit (500 notes)
3. User must manually delete notes or upgrade again

See [pricing.md](./pricing.md) for full downgrade policy.

## Related Documentation

- [pricing.md](./pricing.md) — Plan limits and entitlements
- [integrations-notion.md](./integrations-notion.md) — Notion sync details
- [integrations-obsidian.md](./integrations-obsidian.md) — Obsidian plugin sync details
- [trigger-jobs.md](./trigger-jobs.md) — Scheduled jobs (digest, sequences)
