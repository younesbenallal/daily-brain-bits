# Plan

Implement end-to-end email delivery of note digests (daily/weekly/monthly) by rendering the existing digest items into an email template and sending them via a transactional email provider, with an idempotent “send due digests” job that updates DB state and review history.

## Scope
- In: Resend-backed email sending, digest email template, “due” scheduling logic (daily/weekly/monthly), server-side entitlement checks, DB updates for sent/failed/skipped, and tests.
- Out: AI quiz generation in emails, unsubscribe/preferences center, per-user timezone + “send time of day”, and rich email theming.

## Files (added, updated, deleted)
- Add: `apps/back/utils/note-digest-email.ts` (render + payload shaping)
- Add: `apps/back/utils/resend.ts` (Resend client wrapper)
- Add: `apps/back/scripts/send-due-digests.ts` (cron-invoked job)
- Update: `apps/back/package.json` (script entry for the job)
- Update: `apps/back/.env.example` (email provider env vars)
- Update: `packages/db/src/schemas/core.ts` (if we add delivery metadata fields/statuses)
- Add/Update: `docs/note-digest-email-delivery.md`
- Add: tests under `apps/back/**/__tests__/*` (or colocated `*.test.ts`)

## Nomenclature
- `digest`: a DB-backed batch of note items intended for display and email delivery.
- `send job`: a script/cron task that finds due users, generates/loads a digest, sends an email, and records outcomes.
- `delivery metadata`: provider message id, idempotency key, timestamps, and errors stored in `note_digests.payload_json`/`error_json`.

## UX
- Emails: simple, readable HTML with a “View in app” CTA, list of notes (title + excerpt), and per-note source label (Notion/Obsidian + connection name).
- App: `dash` shows the last sent digest so email links map 1:1 to what the user saw.

## Data flow & db updates
- Inputs: `user_settings.email_frequency`, `user.email`, documents + review state, and integration connection labels.
- Job flow (per due user):
  - Select candidates, generate a digest plan (`generateNoteDigest`), upsert `note_digests` + `note_digest_items`.
  - Render email HTML/text from the digest snapshot.
  - Send via Resend with an idempotency key derived from `noteDigestId` (Resend supports `resend.emails.send(payload, { idempotencyKey })`).
  - On success: set `note_digests.status = sent`, `sent_at = now`, persist `{ resendEmailId, idempotencyKey, provider: "resend" }`, and update `review_states.last_sent_at` for sent documentIds.
  - On no content: mark digest `skipped` with a reason in `payload_json` (and do not update review states).
  - On failure: mark digest `failed` with structured `error_json`, and allow retry.

## Action items
[ ] Set up Resend (API key + verified sender domain/address) and define `RESEND_FROM="digest@dbb.notionist.app"` (and optional `RESEND_REPLY_TO`).
[ ] Add a minimal Resend wrapper with idempotency support and a “dry run” mode for local/dev.
[ ] Implement digest email payload builder (fetch latest digest items, decode content, attach source labels, generate excerpts).
[ ] Implement an HTML + text email template for note digests (no heavy styling; focus on readability).
[ ] Implement “due” scheduling logic for `daily|weekly|monthly` (initially interval-based: 24h/7d/30d since last successful send).
[ ] Implement `apps/back/scripts/send-due-digests.ts` to process due users in batches and write `sent/failed/skipped` to `note_digests`.
[ ] Add server-side entitlement checks (e.g., free users forced to weekly; require `emailVerified` and non-null email).
[ ] Add tests for: due calculation, template rendering, and idempotency/DB state transitions (using a fake mailer).
[ ] Add operational notes: env vars, running the job locally, and safe retry behavior; document in `docs/note-digest-email-delivery.md`.

## Open questions
- None.
