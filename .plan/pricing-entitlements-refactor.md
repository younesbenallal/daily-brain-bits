# Plan

Refactor pricing and entitlement logic to use a central configuration, add server-side enforcement for all limits, and implement note limits as a new gating mechanism.

## Context

Currently, pricing logic is scattered across 15+ files with:
- Binary `isPro` checks everywhere (not tier-aware)
- Frontend-only gating for quizzes and source limits (bypassable)
- Hardcoded strings for plan comparison ("1 source", "Unlimited")
- No note limit enforcement

See `docs/pricing.md` for the canonical pricing source of truth.

## Scope

- In: Central plan config, server-side enforcement for all limits (notes, sources, features), refactoring existing `isPro` checks, note count tracking and gating.
- Out: Usage-based metering for AI quizzes, new tiers beyond Free/Pro, billing provider changes, UI redesign.

## Files (added, updated, deleted)

### New Files
- Add: `packages/core/src/plans.ts` — Central plan configuration (limits, features)
- Add: `packages/core/src/entitlements.ts` — Shared entitlement types and helpers
- Add: `apps/back/utils/plan-enforcement.ts` — Server-side enforcement functions
- Add: `apps/back/routes/usage.ts` — Usage stats endpoint (note count, source count)

### Updated Files (Backend)
- Update: `apps/back/utils/entitlements.ts` — Replace `isPro` with `getUserPlan()`, add `getUserEntitlements()`
- Update: `apps/back/utils/digest-schedule.ts` — Use plan config for frequency gating
- Update: `apps/back/routes/settings.ts` — Return plan + limits in capabilities endpoint
- Update: `apps/back/routes/notion.ts` — Add source limit enforcement on connection
- Update: `apps/back/routes/obsidian.ts` — Add source limit enforcement on connection
- Update: `apps/back/integrations/ingest.ts` — Add note limit enforcement during sync
- Update: `apps/back/utils/email-sequence-templates.tsx` — Use plan config for comparison tables

### Updated Files (Frontend)
- Update: `apps/front/src/components/settings/settings-utils.ts` — Consume new capabilities shape
- Update: `apps/front/src/components/settings/app-settings.tsx` — Use plan limits instead of `isPro`
- Update: `apps/front/src/components/settings/account-integrations-settings.tsx` — Use plan limits, show usage
- Update: `apps/front/src/routes/(app)/onboarding/preferences.tsx` — Use plan limits
- Update: `apps/front/src/routes/(app)/dash.tsx` — Show note usage indicator (optional)

### Schema/Docs
- Update: `docs/pricing.md` — Add implementation notes, remove SQL queries section (superseded)
- Update: `docs/billing-subscriptions.md` — Reference new entitlements architecture

## Nomenclature

- `plan`: A named tier (e.g., `free`, `pro`) with associated limits and features.
- `entitlements`: The resolved limits and feature flags for a specific user based on their plan.
- `enforcement`: Server-side checks that reject actions exceeding plan limits.
- `usage`: Current consumption against limits (e.g., 423/500 notes).

## Data Structures

### Plan Configuration (`packages/core/src/plans.ts`)

```typescript
export const PLAN_IDS = ["free", "pro"] as const;
export type PlanId = (typeof PLAN_IDS)[number];

export type PlanLimits = {
  maxNotes: number;           // Infinity for unlimited
  maxSources: number;         // Infinity for unlimited
};

export type PlanFeatures = {
  dailyDigest: boolean;
  weeklyDigest: boolean;
  monthlyDigest: boolean;
  aiQuizzes: boolean;
};

export type PlanConfig = {
  id: PlanId;
  name: string;
  limits: PlanLimits;
  features: PlanFeatures;
};

export const PLANS: Record<PlanId, PlanConfig> = {
  free: {
    id: "free",
    name: "Free",
    limits: { maxNotes: 500, maxSources: 1 },
    features: { dailyDigest: false, weeklyDigest: true, monthlyDigest: true, aiQuizzes: false },
  },
  pro: {
    id: "pro",
    name: "Pro",
    limits: { maxNotes: 10_000, maxSources: Infinity },
    features: { dailyDigest: true, weeklyDigest: true, monthlyDigest: true, aiQuizzes: true },
  },
};
```

### User Entitlements (`packages/core/src/entitlements.ts`)

```typescript
export type UserEntitlements = {
  planId: PlanId;
  planName: string;
  limits: PlanLimits;
  features: PlanFeatures;
};

export type UserUsage = {
  noteCount: number;
  sourceCount: number;
};

export type UserEntitlementsWithUsage = UserEntitlements & {
  usage: UserUsage;
  withinLimits: {
    notes: boolean;
    sources: boolean;
  };
};
```

### Capabilities Endpoint Response (Updated)

```typescript
// apps/back/routes/settings.ts - capabilities endpoint
{
  capabilities: {
    deploymentMode: "cloud" | "self-hosted",
    billingMode: "polar" | "disabled",
    billingEnabled: boolean,
    // NEW: Replace isPro with full entitlements
    entitlements: {
      planId: "free" | "pro",
      planName: "Free" | "Pro",
      limits: { maxNotes: 500, maxSources: 1 },
      features: { dailyDigest: false, weeklyDigest: true, monthlyDigest: true, aiQuizzes: false },
    },
    usage: {
      noteCount: 423,
      sourceCount: 1,
    },
    // Kept for backward compatibility during migration
    isPro: boolean,
  }
}
```

## Server-Side Enforcement

### Note Limit Enforcement (`apps/back/integrations/ingest.ts`)

Before accepting new documents during sync:
1. Count user's current non-deleted documents
2. Calculate how many new documents are in the batch
3. If `currentCount + newCount > plan.limits.maxNotes`:
   - For Notion: Return error, stop sync, surface in UI
   - For Obsidian: Return error response to plugin, plugin shows warning

```typescript
// Enforcement check
export async function checkNoteLimitForSync(params: {
  userId: string;
  newNoteCount: number;
}): Promise<{ allowed: boolean; currentCount: number; limit: number; overflow: number }> {
  const entitlements = await getUserEntitlements(params.userId);
  const currentCount = await countUserDocuments(params.userId);
  const limit = entitlements.limits.maxNotes;
  const overflow = Math.max(0, currentCount + params.newNoteCount - limit);

  return {
    allowed: overflow === 0 || limit === Infinity,
    currentCount,
    limit,
    overflow,
  };
}
```

### Source Limit Enforcement (`apps/back/routes/notion.ts`, `apps/back/routes/obsidian.ts`)

Before creating a new integration connection:
1. Count user's current active connections
2. If `currentSourceCount >= plan.limits.maxSources`:
   - Return error: "Source limit reached. Upgrade to add more sources."

```typescript
// Enforcement check
export async function checkSourceLimitForConnection(params: {
  userId: string;
}): Promise<{ allowed: boolean; currentCount: number; limit: number }> {
  const entitlements = await getUserEntitlements(params.userId);
  const currentCount = await countUserConnections(params.userId);
  const limit = entitlements.limits.maxSources;

  return {
    allowed: currentCount < limit || limit === Infinity,
    currentCount,
    limit,
  };
}
```

### Feature Gating

For quiz generation and daily digest:
```typescript
// Before generating quiz
const entitlements = await getUserEntitlements(userId);
if (!entitlements.features.aiQuizzes) {
  throw new ORPCError("AI quizzes require a Pro subscription");
}

// In digest-schedule.ts
export function resolveEffectiveFrequency(params: {
  requested: DigestFrequency;
  features: PlanFeatures;
}): DigestFrequency {
  if (params.requested === "daily" && !params.features.dailyDigest) {
    return "weekly";
  }
  return params.requested;
}
```

## Migration Strategy

### Phase 1: Add New Infrastructure (Non-Breaking)
1. Create `packages/core/src/plans.ts` and `packages/core/src/entitlements.ts`
2. Add `getUserEntitlements()` alongside existing `getIsProForUser()`
3. Add usage counting functions
4. Update capabilities endpoint to include new shape (keep `isPro` for compat)

### Phase 2: Add Server-Side Enforcement
1. Add note limit check in sync pipeline
2. Add source limit check in connection routes
3. Add quiz feature check (if quiz generation exists)

### Phase 3: Migrate Frontend
1. Update `useSettingsCapabilities()` to use new shape
2. Replace `isPro` checks with `entitlements.features.*` and `entitlements.limits.*`
3. Add usage display (e.g., "423 / 500 notes")

### Phase 4: Cleanup
1. Remove `isPro` from capabilities (breaking change, coordinate with frontend)
2. Update email templates to use plan config
3. Remove hardcoded strings

## Action Items

### Phase 1: Core Infrastructure
[ ] Create `packages/core/src/plans.ts` with `PLANS` config matching `docs/pricing.md`
[ ] Create `packages/core/src/entitlements.ts` with type definitions
[ ] Add `getUserPlan(userId)` to `apps/back/utils/entitlements.ts` (returns `PlanId`)
[ ] Add `getUserEntitlements(userId)` to `apps/back/utils/entitlements.ts` (returns `UserEntitlements`)
[ ] Add `countUserDocuments(userId)` helper (non-deleted documents)
[ ] Add `countUserConnections(userId)` helper (active connections)
[ ] Update capabilities endpoint in `apps/back/routes/settings.ts` to return `entitlements` + `usage`
[ ] Export plan types from `packages/core/src/index.ts`

### Phase 2: Server-Side Enforcement
[ ] Add `checkNoteLimitForSync()` in `apps/back/utils/plan-enforcement.ts`
[ ] Add `checkSourceLimitForConnection()` in `apps/back/utils/plan-enforcement.ts`
[ ] Integrate note limit check in `apps/back/integrations/ingest.ts` (return error on overflow)
[ ] Integrate source limit check in `apps/back/routes/notion.ts` (before creating connection)
[ ] Integrate source limit check in `apps/back/routes/obsidian.ts` (before creating connection)
[ ] Update `resolveEffectiveFrequency()` to accept `PlanFeatures` instead of `isPro`
[ ] Add feature check before quiz generation (if applicable)

### Phase 3: Frontend Migration
[ ] Update `useSettingsCapabilities()` to parse new `entitlements` shape
[ ] Add `useUserUsage()` hook or extend capabilities hook
[ ] Update `app-settings.tsx` to use `entitlements.features.*` for gating
[ ] Update `account-integrations-settings.tsx` to use `entitlements.limits.maxSources`
[ ] Update `onboarding/preferences.tsx` to use entitlements
[ ] Add note usage indicator somewhere visible (settings or dash)
[ ] Show warning at 80% of note limit, block UI at 100%

### Phase 4: Cleanup & Polish
[ ] Update `email-sequence-templates.tsx` to generate comparison table from `PLANS` config
[ ] Remove hardcoded "1 source" / "Unlimited" strings
[ ] Remove `isPro` from capabilities endpoint (coordinate with frontend)
[ ] Update `docs/pricing.md` with implementation notes
[ ] Add tests for enforcement functions
[ ] Add test for entitlements derivation

## Error Messages

### Note Limit Reached
```
Title: Note limit reached
Body: Your Free plan includes up to 500 notes. You have 500 notes synced.
      To sync more notes, upgrade to Pro or remove some existing notes.
CTA: [Upgrade to Pro] [Manage Notes]
```

### Source Limit Reached
```
Title: Source limit reached
Body: Your Free plan includes 1 knowledge source.
      Upgrade to Pro to connect multiple sources.
CTA: [Upgrade to Pro]
```

### Daily Digest Gated
```
Title: Daily digests are Pro-only
Body: Free plan includes weekly and monthly digests.
      Upgrade to receive daily note reminders.
CTA: [Upgrade to Pro]
```

## Testing

- [ ] Unit test: `getUserEntitlements()` returns correct config for free/pro
- [ ] Unit test: `checkNoteLimitForSync()` blocks when over limit
- [ ] Unit test: `checkSourceLimitForConnection()` blocks when at limit
- [ ] Unit test: `resolveEffectiveFrequency()` downgrades daily→weekly for free
- [ ] Integration test: Notion connection blocked for free user with 1 source
- [ ] Integration test: Obsidian sync returns error when note limit exceeded
- [ ] E2E test: Upgrade flow unlocks previously gated features

## Open Questions

- Should we show a "usage" page in settings with a visual progress bar?
- For note limit: hard block vs. soft warning (allow sync but show warning)?
- Obsidian plugin: How to surface note limit errors gracefully in the plugin UI?
