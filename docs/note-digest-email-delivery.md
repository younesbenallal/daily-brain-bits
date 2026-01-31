# Note Digest Email Delivery

## Summary

- Generates daily digests for every user and sends emails via Resend on the user's cadence.
- Supports **timezone-aware scheduling** with per-user preferred send times.
- Uses an idempotent send job that writes delivery metadata to `note_digests` and updates `review_states.last_sent_at`.
- Runs via **Trigger.dev schedule** (hourly) or manual script execution.

## Scope

- In scope: digest scheduling, timezone-aware delivery, email rendering, Resend delivery, and delivery state updates.
- Out of scope: AI quizzes, unsubscribe management, bounce processing.

## Nomenclature
- `digest`: a stored batch of notes prepared for delivery.
- `send job`: the script that selects due users, renders email payloads, and sends them.
- `idempotency key`: deterministic key used by Resend to prevent duplicate sends.
- `send window`: the 1-hour window when a user's preferred send hour matches the current local time.

## Main Files

| Path | Responsibility |
|------|----------------|
| `apps/back/scripts/generate-daily-digests.ts` | Cron-style job to build a daily digest for every user. |
| `apps/back/scripts/send-due-digests.ts` | Cron-style job to send due digests and update DB state. |
| `apps/back/scripts/run-digest-cron.ts` | Orchestrated job: generate then send in sequence (manual fallback). |
| `apps/trigger/src/tasks/digest-hourly.ts` | Trigger.dev hourly schedule for digest generation + send. |
| `apps/back/utils/digest-generation.ts` | Builds digest items using the note selection algorithm. |
| `apps/back/domains/digest/schedule.ts` | Frequency resolution, timezone conversion, and due checks. |
| `apps/back/utils/digest-storage.ts` | Inserts or updates digest + items in a transaction. |
| `apps/back/utils/note-digest-email.ts` | Loads digest snapshots and renders React Email + text payloads. |
| `apps/back/utils/note-digest-email-template.tsx` | React Email template and excerpt helpers. |
| `apps/back/domains/email/resend.ts` | Resend client wrapper with idempotency support. |
| `apps/back/routes/digest.ts` | Serves the last sent digest to the app dashboard. |
| `apps/back/routes/settings.ts` | User settings API including timezone and preferred send hour. |
| `apps/back/scripts/send-test-digest-email.ts` | Sends a fake-data digest email without touching the DB. |
| `packages/db/src/schemas/core.ts` | `note_digests`, `note_digest_items`, `review_states`, `user_settings` tables. |
| `apps/trigger/trigger.config.ts` | Trigger.dev configuration and task discovery. |

## Main Flows

### Generate daily digests

1. For each user, check the most recent digest; if one already exists for their **local day**, skip.
2. Generate a daily note selection and store it as `scheduled` with `scheduled_for` set to local midnight (UTC timestamp).
3. If no documents or no items are available, create a `skipped` digest with a reason.

### Send due digests (timezone-aware)

1. Load users, settings (including timezone and preferred send hour), pro entitlements, and last sent digest timestamps.
2. For each user, check if they are in their **send window**:
   - Calculate the current hour in the user's timezone using `Intl.DateTimeFormat`.
   - Compare against their `preferredSendHour` (default: 8 = 8am local time).
3. Resolve the effective frequency (free users are coerced to weekly) and stagger weekly/monthly sends by user hash.
4. For each due user:
   - Find today's scheduled digest (using **local day** comparison, not UTC).
   - If the digest has no items, mark it as `skipped`.
5. **Detect first digest**: If the user has no previous `sent` digests (`lastSentAt` is null), this is their first digest.
6. For first digests, fetch additional context: total document count and primary source label.
7. Render React Email + text email from the stored digest snapshot, with `isFirstDigest` flag for welcome messaging.
8. Send via Resend with `idempotencyKey = note-digest-<digestId>`.
9. On success: mark digest `sent`, store Resend metadata, and update `review_states.last_sent_at`.
10. On failure: mark digest `failed` and store `error_json`.

### First Digest Welcome Messaging

When a user receives their **first digest** (detected via `!lastSentAt`), the email includes special welcome content:

**Subject**: "Your first Brain Bits are ready! (X notes)"

**Content differences from regular digests**:
- Personalized headline: "Your first Brain Bits are ready, {name}!"
- Context line: "We've surfaced X notes from your {Notion/Obsidian} out of Y synced notes using spaced repetition"
- "What happens next" section explaining:
  - Next digest timing and frequency
  - How to star/skip notes for better recommendations
  - Link to settings to adjust preferences
- Soft Pro upgrade mention (for free users only)
- Reply invitation from founder

**Parameters passed to `buildDigestEmail()`**:
- `isFirstDigest: boolean` — detected via `!lastSentAt`
- `totalNoteCount: number` — total synced documents for the user
- `sourceLabel: string | null` — primary integration label (e.g., "Obsidian" or "Notion (My Workspace)")
- `isPro: boolean` — whether user has Pro subscription
- `founderEmail: string` — reply-to email address

### Trigger.dev schedule (recommended for production)

1. `digest-hourly` runs every hour via Trigger.dev schedule.
2. Generates daily digests (idempotent per-user per day).
3. Sends due digests using timezone-aware checks.

### Orchestrated run (for manual/testing)

1. `run-digest-cron.ts` runs daily: generate then send in a single process.
2. This guarantees sends only happen after the daily digest generation has completed.

### Dashboard display

1. The `digest.today` route selects the most recent `sent` digest (fallback to latest for new users).
2. The frontend dashboard displays that digest so it matches the email content.

## Timezone Scheduling

### How it works

1. Each user has a `timezone` (IANA string, e.g., "America/New_York") and `preferredSendHour` (0-23).
2. Trigger.dev schedule runs every hour at `:00`.
3. For each invocation, we calculate which users have their local time matching their preferred hour.
4. Users receive digests in the **morning of their local time**, not a fixed UTC time.

### Key functions in `domains/digest/schedule.ts`

| Function | Purpose |
|----------|---------|
| `isDigestDueWithTimezone()` | Full due check with timezone support. |
| `isInSendWindow()` | Check if current hour matches user's preferred hour. |
| `getHourInTimezone()` | Get current hour (0-23) in a timezone. |
| `isSameLocalDay()` | Compare dates in user's local timezone. |
| `isValidTimezone()` | Validate IANA timezone string. |

### DST handling

The `Intl.DateTimeFormat` API handles Daylight Saving Time automatically. If a user sets 8am and DST shifts, they still receive their email at 8am local time.

## Data Model / DB

- Tables/entities:
  - `note_digests` (status, scheduled_for, sent_at, payload_json, error_json)
  - `note_digest_items` (digest-to-document join, ordered by position)
  - `review_states` (per-document review history; `last_sent_at` updated on send)
  - `user_settings` (email preferences including timezone and send time)
- User settings fields:
  - `timezone` (text, default: "UTC") — IANA timezone string
  - `preferredSendHour` (integer, default: 8) — Hour in local time (0-23)
  - `emailFrequency` (enum: daily/weekly/monthly)
- Identifiers and uniqueness:
  - Digest send idempotency key is derived from `note_digests.id`.
  - `note_digest_items` is unique on `(note_digest_id, document_id)`.
- Invariants:
  - A `sent` digest should have `sent_at` and preserved `note_digest_items`.
  - `review_states.last_sent_at` reflects the most recent delivered digest.

## External Constraints

- Resend enforces idempotency by key and returns a provider email id.
- Email rendering favors simple HTML to keep client compatibility.
- Trigger.dev: per-task retries, queue control, and durable waits.

## Testing / Verification

- Run unit tests:
  - `bun test apps/back/utils/digest-schedule.test.ts` (tests `domains/digest/schedule.ts`)
  - `bun test apps/back/utils/note-digest-email.test.ts`
- Generate daily digests locally:
  - `bun --env-file apps/back/.env apps/back/scripts/generate-daily-digests.ts`
- Run the job locally (dry run):
  - `DIGEST_EMAIL_DRY_RUN=true bun --env-file apps/back/.env apps/back/scripts/send-due-digests.ts`
- Send a fake-data test email (no DB access):
  - `bun --env-file apps/back/.env apps/back/scripts/send-test-digest-email.ts --to you@example.com`
- Send a fake-data test email (dry run):
  - `bun apps/back/scripts/send-test-digest-email.ts --to you@example.com --dry-run`
- Run the orchestrated daily cron:
  - `bun --env-file apps/back/.env apps/back/scripts/run-digest-cron.ts`
### Trigger.dev tasks

- Run tasks locally with the Trigger.dev CLI from `apps/trigger`.

## Configuration

- `RESEND_API_KEY` (required)
- `RESEND_FROM` (default: `digest@dbb.notionist.app`)
- `RESEND_REPLY_TO` (optional)
- `DIGEST_EMAIL_DRY_RUN` (optional, `true` to skip external send)
- `FRONTEND_URL` (used for the "View in app" link)
- `TEST_EMAIL_TO` (optional, default recipient for the test email script)

## Future Work

- Add unsubscribe and notification preferences.
- Track opens/clicks, bounce handling, and retry/backoff limits.
- Support richer email layout or branded themes.
- A/B test send times to optimize engagement.
