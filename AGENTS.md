This is the Daily Brain Bits (DBB) repository.

- User connects one (or more) source (Notion or Obsidian).
- We sync notes into our backend (full sync), keep them up-to-date, and store review history.
- Each day (or week, or month) the backend selects \(n\) notes (spaced repetition + priority/deprioritize signals).
- Backend sends emails and (optionally) generates quizzes with an LLM.

## Commands

- `bun type-check` - check types
- `bun test` - run tests

## Rules
- run type-check after you finish your work
- never run the dev server

## Technologies (current stack)

### Tooling
- Bun. Please use Bun as script runner, package manager, and runtime.
- Turborepo

### Backend
- Hono
- oRPC + zod
- Drizzle
- Better Auth

### Frontend
- React 19
- Tailwind CSS v4
- TanStack Router
- React Query (integrated with oRPC via `createORPCReactQueryUtils`)
- shadcn/ui using BaseUI (not Radix) for unstyled components

## Engineering conventions

- Keep modules small and focused; split large files.
- Prefer shared domain types in `packages/core` and integration-specific adapters in `packages/integrations/*`.
- Privacy is a product feature:
  - minimize data sent externally (especially to LLMs)
  - encryption at rest, plus user delete/export flows
- This project is open source and self-hosted friendly. Make sure tha all changes are compatible with self-hosting.

## Docs
all located in the `docs` folder.
- `pricing.md` — **Pricing source of truth**: plans, limits, entitlements, and rationale.
- `onboarding-flow.md` — Frontend onboarding flow, routes, and gating.
- `billing-subscriptions.md` — Billing and subscription management via Polar.
- `integrations-architecture.md` — Shared sync contract and integration architecture.
- `integrations-notion.md` — Notion incremental database sync (cursor, rate limits, markdown).
- `integrations-obsidian.md` — Obsidian plugin push sync (batching, local index).
- `sync-flow-and-limits.md` — Sync flow, plan limit enforcement, and upgrade behavior.
- `note-digest-selection.md` — Note digest scoring + selection algorithm.
- `note-digest-email-delivery.md` — Digest email delivery pipeline with timezone-aware scheduling via Trigger.dev + Resend.
- `email-sequences.md` — Lifecycle email sequence plan and implementation notes.
- `analytics-posthog.md` — PostHog analytics setup and event catalog.
- `trigger-jobs.md` — Trigger.dev job architecture and configuration.
- `self-hosting.md` — Docker Compose self-hosting guide (DB + app + Trigger.dev).
