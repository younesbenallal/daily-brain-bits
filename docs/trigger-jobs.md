# Trigger.dev Jobs (Cloud Only)

## Summary

- Runs DBB background workflows on Trigger.dev Cloud.
- **Only used for cloud deployments** - self-hosted uses a simple cron container instead.
- Covers digest delivery and lifecycle email sequences.

## Scope

- In scope: digest scheduling, sequence orchestration, job triggers from backend events.
- Out of scope: task UI setup, billing, and provider-specific deployment.

## Nomenclature

- `run`: a single Trigger.dev execution.
- `sequence runner`: long-running task that waits between emails for a single user.

## Main Files

| Path | Responsibility |
|------|----------------|
| `apps/trigger/trigger.config.ts` | Trigger.dev project config and task discovery. |
| `apps/trigger/src/tasks/digest-hourly.ts` | Hourly schedule to generate and send digests. |
| `apps/trigger/src/tasks/digest-send-for-user.ts` | On-demand send for a single user's first digest. |
| `apps/trigger/src/tasks/email-sequence-runner.ts` | Long-running per-user sequence workflow. |
| `apps/trigger/src/tasks/upgrade-sequence-discover.ts` | Periodic discovery of upgrade sequence entries. |
| `apps/trigger/src/tasks/notion-sync-weekly.ts` | Weekly Notion sync for all active connections. |
| `apps/back/routes/obsidian.ts` | Triggers onboarding sequence on Obsidian connect. |
| `packages/auth/auth.ts` | Triggers welcome/onboarding sequences on signup/connect. |

## Main Flows

### Digest delivery

1. Trigger.dev runs `digest-hourly` on the hour.
2. The task generates daily digests (idempotent per user/day).
3. The task sends due digests using timezone-aware checks.
4. When the first digest is created after a new sync, the backend triggers `digest-send-for-user` to send immediately.

### Email sequences

1. Backend creates `email_sequence_states` rows on signup or integration connect.
2. Backend triggers `email-sequence-runner` with `{ userId, sequenceName }`.
3. The runner waits until the next step is due and sends the email.
4. Exit conditions are checked before each send.

### Upgrade discovery

1. `upgrade-sequence-discover` runs hourly.
2. It inserts upgrade sequence states for eligible users.
3. It triggers `email-sequence-runner` for each new entry.

### Notion sync

1. `notion-sync-weekly` runs every Sunday at 3 AM UTC.
2. It fetches all active Notion connections with valid tokens.
3. For each connection, it runs an incremental sync (cursor-based, only fetches pages modified since last sync).
4. A 2-second delay is added between connections to respect Notion API rate limits.

## Data Model / DB

- Tables/entities:
  - `email_sequence_states`
  - `email_sends`
  - `note_digests`, `note_digest_items`, `review_states`
- Identifiers and uniqueness:
  - Sequence send idempotency uses `sequence-run-<sequence>-<userId>`.
  - Digest send idempotency uses `note-digest-<digestId>`.
- Invariants:
  - Sequence states are unique per user + sequence.
  - A sent digest has `sent_at` and immutable items.

## External Constraints

- Trigger.dev must have network access to DB + Resend.
- Task environments must include the same env vars as the backend.

## Testing / Verification

- Run digest job locally (manual fallback):
  - `bun --env-file apps/back/.env apps/back/scripts/run-digest-cron.ts`
- Run email sequence runner manually:
  - `bun --env-file apps/back/.env apps/back/scripts/send-due-sequence-emails.ts`

## Configuration (Cloud Deployment)

### Backend (`apps/back`)
- `TRIGGER_SECRET_KEY` (required to trigger runs from backend)

### Trigger app (`apps/trigger`)
- `TRIGGER_PROJECT_REF` (required for deployment, set in `apps/trigger/.env`)

### Deployment

1. Login to Trigger.dev: `npx trigger.dev login`
2. Set project ref in `apps/trigger/.env`
3. Deploy tasks: `cd apps/trigger && npx trigger.dev deploy`
4. Set env vars in Trigger.dev dashboard (same as backend)

## Self-Hosted

Self-hosted deployments do **not** use Trigger.dev. Instead:
- Digest cron runs via a simple Docker container (see `docker-compose.yml`)
- Email sequences are disabled

See [self-hosting.md](./self-hosting.md) for details.
