# Pricing

This document is the single source of truth for Daily Brain Bits pricing, limits, and entitlements.

## Hosted Plans

| Plan | Price | Notes Limit | Sources | Digest Interval | Notes/Digest | AI Quizzes |
|------|-------|-------------|---------|-----------------|--------------|------------|
| Free | $0 | 500 | 1 | 3-30 days | 5 (fixed) | No |
| Pro | $10/mo | 10,000 | Unlimited | 1-30 days (daily) | 1-50 | Yes |

### Plan Details

**Free**
- Target: Users evaluating DBB or with small note collections
- Polar slug: N/A (absence of active subscription)
- Digest interval: Every 3 to 30 days (no daily/every-2-days)
- Upgrade triggers: Note limit, daily delivery, AI quizzes, multiple sources

**Pro**
- Target: Individual power users and knowledge workers
- Polar slug: `pro`
- Polar product ID: `POLAR_PRO_PRODUCT_ID`
- Digest interval: Every 1 to 30 days (includes daily)

## Self-Hosted (Open Source)

| Plan | Price | Notes Limit | Sources | Digest Interval | Notes/Digest | AI Quizzes |
|------|-------|-------------|---------|-----------------|--------------|------------|
| OSS | $0 | Unlimited | Unlimited | 1-30 days | 1-50 | Yes (BYO LLM keys) |

- No Polar billing integration
- User provides own infrastructure, email delivery, and LLM API keys
- Enable with `DEPLOYMENT_MODE=self-hosted`

## Entitlement Logic

| Entitlement | Free | Pro | Self-Hosted |
|-------------|------|-----|-------------|
| `maxNotes` | 500 | 10,000 | Unlimited |
| `maxSources` | 1 | Unlimited | Unlimited |
| `maxNotesPerDigest` | 5 | 50 | 50 |
| `minDigestIntervalDays` | 3 | 1 | 1 |
| `maxDigestIntervalDays` | 30 | 30 | 30 |
| `aiQuizzes` | No | Yes | Yes |

### Digest Interval

The digest interval determines how frequently users receive their note digests:
- **Daily (1 day)**: Pro only - for users who want maximum knowledge retention
- **Every 2 days**: Pro only
- **Every 3+ days**: Available to all users
- **Default**: 7 days (weekly equivalent) for new users

Users select their preferred interval in settings. The backend clamps the value to the user's plan limits.

## Implementation Notes

- Source of truth lives in `packages/core/src/plans.ts` (plan limits + features).
- Backend resolves per-user entitlements in `apps/back/domains/billing/entitlements.ts`.
- Limits are enforced server-side during sync (`apps/back/integrations/ingest.ts`) and connection creation (`apps/back/routes/obsidian.ts`, `packages/auth/auth.ts`).
- Usage stats (note/source counts) are exposed via `apps/back/routes/settings.ts` (capabilities) and `apps/back/routes/usage.ts`.

## Limit Enforcement

### Note Limits

When a user reaches their note limit:
1. **Sync blocked** — New notes are rejected during sync
2. **UI notification** — Show warning at 80%, block at 100%
3. **Existing notes preserved** — Read-only access continues
4. **Upgrade prompt** — Clear CTA to upgrade

### Downgrade Handling

If a Pro user downgrades with notes over the Free limit:
1. Notes are preserved (no deletion)
2. New syncs blocked until under limit
3. User can manually delete notes or upgrade again

If a Pro user downgrades with a digest interval less than 3 days:
1. Interval is automatically clamped to 3 days
2. User notified of the change in settings

## Related Documentation

- [Billing & Subscriptions](./billing-subscriptions.md) — Polar integration details
- [Trigger Jobs](./trigger-jobs.md) — Digest scheduling and delivery
