# Plan

Add Sentry error monitoring to the backend (API + cron/scripts) so exceptions, failed jobs, and key request context show up in Sentry with actionable tags/user context. Keep the integration lightweight: initialize once, capture unhandled errors, and wire it into Hono/oRPC error paths without changing business logic.

## Scope
- In: Backend API (`apps/back/app.ts`) error reporting, background scripts under `apps/back/scripts/`, shared Sentry init/util module, env var plumbing, and a short docs page under `docs/`.
- Out: Frontend/webapp and the Obsidian plugin Sentry setup (can be added next once we decide on DSNs/environments and privacy requirements there).

## Files (added, updated, deleted)
- `apps/back/utils/sentry.ts`
- `apps/back/app.ts`
- `apps/back/scripts/send-due-digests.ts`
- `apps/back/utils/env.ts`
- `docs/monitoring-sentry.md`
- `AGENTS.md`

## Nomenclature
- `SENTRY_DSN` — Sentry project DSN for backend.
- `SENTRY_ENVIRONMENT` — e.g. `development` / `staging` / `production`.
- `SENTRY_RELEASE` — git SHA or deploy version (optional).
- `SENTRY_TRACES_SAMPLE_RATE` — number in `[0..1]` (optional).

## UX
- No UI changes; backend failures become visible in Sentry with enough context to debug (route/job name, userId when available).

## Data flow & db updates
- No DB changes.
- API: request hits Hono → on error we capture to Sentry with route/method + authenticated user context (id/email) when present.
- Scripts: job entrypoint wraps `main()` → capture exceptions/unhandled rejections → `flush()` before exit.

## Action items
[ ] Pick the correct Sentry SDK for Bun/Hono (Node vs Bun SDK) and add deps to `apps/back/package.json`.
[ ] Add `apps/back/utils/sentry.ts` to initialize Sentry from env and provide helpers (`captureException`, `withSentryScope`).
[ ] Wire Sentry into `apps/back/app.ts` error middleware + oRPC `onError` interceptor (avoid double-captures).
[ ] Wrap `apps/back/scripts/send-due-digests.ts` (and other script entrypoints if needed) to capture + flush on failure.
[ ] Extend `apps/back/utils/env.ts` schema with Sentry env vars (optional/disabled by default).
[ ] Add a Bun test for the Sentry env parsing / init behavior (DSN set vs unset).
[ ] Add `docs/monitoring-sentry.md` with setup steps, env vars, and privacy notes; add it to `AGENTS.md` docs index.
[ ] Validate locally: run `bun test` and run one script with an injected failure to confirm events are sent (or logged when DSN missing).

## Open questions
- Do you want Sentry only for backend, or also for `apps/obsidian-plugin` (separate DSN) in this same pass?
- Should we include user email in Sentry context, or restrict to `userId` only for privacy?
- Do you want performance tracing (transactions) enabled now, or start with errors only?
