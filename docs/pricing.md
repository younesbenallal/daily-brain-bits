# Pricing

This document is the single source of truth for Daily Brain Bits pricing, limits, and entitlements.

## Hosted Plans

| Plan | Price | Notes Limit | Sources | Email Frequency | AI Quizzes |
|------|-------|-------------|---------|-----------------|------------|
| Free | $0 | 500 | 1 | Weekly / Monthly | No |
| Pro | $10/mo | 10,000 | Unlimited | Daily | Yes |

### Plan Details

**Free**
- Target: Users evaluating DBB or with small note collections
- Polar slug: N/A (absence of active subscription)
- Upgrade triggers: Note limit, daily frequency, AI quizzes, multiple sources

**Pro**
- Target: Individual power users and knowledge workers
- Polar slug: `pro`
- Polar product ID: `POLAR_PRO_PRODUCT_ID`

## Self-Hosted (Open Source)

| Plan | Price | Notes Limit | Sources | Email Frequency | AI Quizzes |
|------|-------|-------------|---------|-----------------|------------|
| OSS | $0 | Unlimited | Unlimited | All | Yes (BYO LLM keys) |

- No Polar billing integration
- User provides own infrastructure, email delivery, and LLM API keys
- Enable with `DEPLOYMENT_MODE=self-hosted`

## Entitlement Logic

| Entitlement | Free | Pro | Self-Hosted |
|-------------|------|-----|-------------|
| `maxNotes` | 500 | 10,000 | Unlimited |
| `maxSources` | 1 | Unlimited | Unlimited |
| `dailyEmails` | No | Yes | Yes |
| `weeklyEmails` | Yes | Yes | Yes |
| `monthlyEmails` | Yes | Yes | Yes |
| `aiQuizzes` | No | Yes | Yes |

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


## Related Documentation

- [Billing & Subscriptions](./billing-subscriptions.md) — Polar integration details
- [Trigger Jobs](./trigger-jobs.md) — Digest scheduling and delivery
