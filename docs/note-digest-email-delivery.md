# Note Digest Email Delivery

## Summary

- Generates daily digests for every user and sends emails via Resend on the user’s cadence.
- Uses an idempotent send job that writes delivery metadata to `note_digests` and updates `review_states.last_sent_at`.

## Scope

- In scope: digest scheduling, email rendering, Resend delivery, and delivery state updates.
- Out of scope: AI quizzes, unsubscribe management, bounce processing, and user timezones.

## Nomenclature
- `digest`: a stored batch of notes prepared for delivery.
- `send job`: the script that selects due users, renders email payloads, and sends them.
- `idempotency key`: deterministic key used by Resend to prevent duplicate sends.

## Main Files

| Path | Responsibility |
|------|----------------|
| `apps/back/scripts/generate-daily-digests.ts` | Cron-style job to build a daily digest for every user. |
| `apps/back/scripts/send-due-digests.ts` | Cron-style job to send due digests and update DB state. |
| `apps/back/utils/digest-generation.ts` | Builds digest items using the note selection algorithm. |
| `apps/back/utils/digest-schedule.ts` | Frequency resolution (daily/weekly/monthly) and due checks. |
| `apps/back/utils/digest-storage.ts` | Inserts or updates digest + items in a transaction. |
| `apps/back/utils/note-digest-email.ts` | Loads digest snapshots and renders HTML/text emails. |
| `apps/back/utils/note-digest-email-template.ts` | Pure email rendering utilities (HTML/text + excerpts). |
| `apps/back/utils/resend.ts` | Resend client wrapper with idempotency support. |
| `apps/back/routes/digest.ts` | Serves the last sent digest to the app dashboard. |
| `packages/db/src/schemas/core.ts` | `note_digests`, `note_digest_items`, `review_states` tables. |

## Main Flows

### Generate daily digests

1. For each user, check the most recent digest; if one already exists for today, skip.
2. Generate a daily note selection and store it as `scheduled`.
3. If no documents or no items are available, create a `skipped` digest with a reason.

### Send due digests

1. Load users, settings, pro entitlements, and last sent digest timestamps.
2. Resolve the effective frequency (free users are coerced to weekly) and stagger weekly/monthly sends by user hash to avoid same-day spikes.
3. For each due user:
   - Find today’s scheduled digest (or retry a failed one).
   - If the digest has no items, mark it as `skipped`.
4. Render HTML + text email from the stored digest snapshot.
5. Send via Resend with `idempotencyKey = note-digest-<digestId>`.
6. On success: mark digest `sent`, store Resend metadata, and update `review_states.last_sent_at`.
7. On failure: mark digest `failed` and store `error_json`.

### Orchestrated run (recommended)

1. `run-digest-cron.ts` runs daily: generate then send in a single process.
2. This guarantees sends only happen after the daily digest generation has completed.

### Dashboard display

1. The `digest.today` route selects the most recent `sent` digest (fallback to latest for new users).
2. The frontend dashboard displays that digest so it matches the email content.

## Data Model / DB

- Tables/entities:
  - `note_digests` (status, scheduled_for, sent_at, payload_json, error_json)
  - `note_digest_items` (digest-to-document join, ordered by position)
  - `review_states` (per-document review history; `last_sent_at` updated on send)
- Identifiers and uniqueness:
  - Digest send idempotency key is derived from `note_digests.id`.
  - `note_digest_items` is unique on `(note_digest_id, document_id)`.
- Invariants:
  - A `sent` digest should have `sent_at` and preserved `note_digest_items`.
  - `review_states.last_sent_at` reflects the most recent delivered digest.

## External Constraints

- Resend enforces idempotency by key and returns a provider email id.
- Email rendering favors simple HTML to keep client compatibility.

## Testing / Verification

- Run unit tests:
  - `bun test apps/back/utils/digest-schedule.test.ts`
  - `bun test apps/back/utils/note-digest-email.test.ts`
- Generate daily digests locally:
  - `bun --env-file apps/back/.env apps/back/scripts/generate-daily-digests.ts`
- Run the job locally (dry run):
  - `DIGEST_EMAIL_DRY_RUN=true bun --env-file apps/back/.env apps/back/scripts/send-due-digests.ts`
- Run the orchestrated daily cron:
  - `bun --env-file apps/back/.env apps/back/scripts/run-digest-cron.ts`

## Configuration

- `RESEND_API_KEY` (required)
- `RESEND_FROM` (default: `digest@dbb.notionist.app`)
- `RESEND_REPLY_TO` (optional)
- `DIGEST_EMAIL_DRY_RUN` (optional, `true` to skip external send)
- `FRONTEND_URL` (used for the “View in app” link)

## Future Work

- Add timezone-aware scheduling and preferred send times.
- Add unsubscribe and notification preferences.
- Track opens/clicks, bounce handling, and retry/backoff limits.
- Support richer email layout or branded themes.
