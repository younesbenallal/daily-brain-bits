This is the Daily Brain Bits (DBB) repository.

- User connects one (or more) source (Notion or Obsidian).
- We sync notes into our backend (full sync), keep them up-to-date, and store review history.
- Each day (or week, or month) the backend selects \(n\) notes (spaced repetition + priority/deprioritize signals).
- Backend sends emails and (optionally) generates quizzes with an LLM.

## Commands

`bun type-check` - check types

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

## Engineering conventions (Cursor should follow)

- Keep modules small and focused; split large files.
- Prefer shared domain types in `packages/core` and integration-specific adapters in `packages/integrations/*`.
- Privacy is a product feature:
  - minimize data sent externally (especially to LLMs)
  - encryption at rest, plus user delete/export flows

## Docs
- `docs/integrations-architecture.md` — Shared sync contract and integration architecture.
- `docs/integrations-notion.md` — Notion incremental database sync (cursor, rate limits, markdown).
- `docs/integrations-obsidian.md` — Obsidian plugin push sync (batching, local index).
- `docs/note-digest-selection.md` — Note digest scoring + selection algorithm.
- `docs/note-digest-email-delivery.md` — Digest email delivery pipeline with timezone-aware scheduling via Trigger.dev + Resend.
- `docs/email-sequences.md` — Lifecycle email sequence plan and implementation notes.
- `docs/billing-subscriptions.md` — Billing and subscription management via Polar.
- `docs/analytics-posthog.md` — PostHog analytics setup and event catalog.
- `docs/trigger-jobs.md` — Trigger.dev job architecture and configuration.
- `docs/self-hosting.md` — Docker Compose self-hosting guide (DB + app + Trigger.dev).
