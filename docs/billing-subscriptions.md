# Billing & Subscriptions (Polar)

## Context / Overview
Daily Brain Bits uses Polar to handle subscriptions, checkout, and customer portal flows. The app surfaces billing controls in Settings, and uses Polar customer state to gate Pro-only features (daily emails, AI quizzes, and multiple sources). Customer and subscription records are mirrored into the DB via webhooks to enable fast entitlement checks and auditability.

## Plans & Pricing

DBB has a hosted version (Free/Pro) and an open source self-hosted version. Pricing for the hosted plans is configured in Polar; update the values here whenever it changes.

| Plan | Polar slug | Billing interval | Price | Entitlements |
| --- | --- | --- | --- | --- |
| Open Source (self-hosted) | N/A | N/A | $0 | Core app for self-hosting; BYO email + LLM keys; no Polar-managed billing |
| Free (hosted) | `free` (implicit) | N/A | $0 | Weekly/monthly emails, 1 source, no AI quizzes |
| Pro | `pro` | Monthly | $10 | Daily emails, AI quizzes, multiple sources |

Notes:
- Open Source is a distribution/hosting mode, not a Polar plan.
- Free (hosted) has no Polar product; it is the absence of an active subscription.
- Pro maps to `POLAR_PRO_PRODUCT_ID` and uses the checkout slug `pro`.

### Open Source (Self-Hosted) Details

- Intended for individuals who prefer running DBB on their own infrastructure.
- Billing is not handled by Polar in this mode (no checkout, no portal, no webhook requirements).
- You typically bring your own providers:
  - Email delivery (SMTP/provider)
  - LLM keys (for quizzes) if enabled
- Support expectations: community/self-support vs. managed support for hosted Pro.
- Enable self-hosted mode with `DEPLOYMENT_MODE=self-hosted` (all users are treated as Pro).

## Technical Architecture

| Area | File | Responsibility |
| --- | --- | --- |
| Auth integration | `packages/auth/polar.ts` | Configures Polar SDK + Better Auth Polar plugin, checkout/portal/usage/webhooks, and customer metadata. |
| Auth bootstrap | `packages/auth/auth.ts` | Enables Polar plugin when access token is present (hard fail in production if missing). |
| DB schema | `packages/db/src/schemas/core.ts` | Persists `billing_customers` and `billing_subscriptions`. |
| Settings routing | `apps/front/src/routes/(app)/settings.tsx` | Settings route + tab parsing. |
| Settings UI | `apps/front/src/components/settings/*.tsx` | App/account/billing sections and plan-aware controls. |
| Settings helpers | `apps/front/src/components/settings/settings-utils.ts` | Customer state parsing and plan derivation. |

## Data Flow

1. **Signup**
   - Better Auth + Polar plugin creates a Polar customer when `createCustomerOnSignUp` is enabled.
   - Customer metadata includes `userId` for backend mapping.

2. **Upgrade to Pro**
   - Frontend calls `authClient.checkout({ slug: "pro" })`.
   - Polar handles checkout and redirects to the configured success URL.

3. **Webhook updates**
   - Polar webhooks hit `/api/auth/polar/webhooks`.
   - `packages/auth/polar.ts` upserts customers/subscriptions into `billing_customers` and `billing_subscriptions`.

4. **Settings gating**
   - Settings UI calls `authClient.customer.state()` and derives `planSummary`.
   - App preferences disable Pro-only options for free users.
   - Integrations section highlights the 1‑source limit on Free.

5. **Billing management**
   - “Manage subscription” opens the Polar customer portal.
   - Orders are fetched via `authClient.customer.orders.list()` and listed in Settings.

## Implementation Details

- **Plan detection**: The UI treats any active subscription returned by customer state as “Pro”.
- **Email frequency**: If a free user is set to daily, the UI switches to weekly and displays a notice.
- **Quiz gating**: The quiz toggle is disabled on Free and saved as `false`.
- **Invoices**: Orders list tries to extract a receipt URL; if missing, it routes the user to the portal.
- **React Query**: Customer state and orders use shared query keys to avoid refetching.
- **Entitlements**: Server-side entitlements are derived from `packages/core/src/plans.ts`, exposed via the settings capabilities endpoint, and enforced during sync and connection creation.

## DB Schema

- `billing_customers`
  - `user_id` (PK)
  - `polar_customer_id` (unique)
  - `email`, `metadata_json`, timestamps

- `billing_subscriptions`
  - `id` (PK, Polar subscription ID)
  - `user_id`
  - `polar_customer_id`, `product_id`, `price_id`
  - `status`, `current_period_start`, `current_period_end`, `cancel_at_period_end`
  - `canceled_at`, `ended_at`, `metadata_json`, timestamps

## Dependencies

- `@polar-sh/better-auth`
- `@polar-sh/sdk`
- `better-auth`
- `@tanstack/react-query`

## Configuration

Required:
- `POLAR_ACCESS_TOKEN`
- `POLAR_WEBHOOK_SECRET`

Recommended:
- `POLAR_PRO_PRODUCT_ID`
- `POLAR_SERVER` (set to `sandbox` when needed)
- `FRONTEND_URL`

Self-hosting:
- `DEPLOYMENT_MODE=self-hosted` disables Polar and unlocks Pro features.

## Tests Implemented

- None yet.

## Future Work

- Enforce entitlements server-side for digest frequency, quizzes, and multi-source limits.
- Add usage-based billing and meters for AI quiz overages.
- Record benefit grants to map features to Polar benefits instead of hardcoded plan rules.
- Add E2E coverage for checkout → webhook → entitlement flow.
