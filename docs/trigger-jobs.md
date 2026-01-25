# Trigger.dev Jobs

## Summary

- Runs DBB background workflows on Trigger.dev (cloud or self-hosted).
- Self-host uses the Trigger.dev v3 Docker stack (see `docker-compose.yml`).
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
| `apps/trigger/src/tasks/email-sequence-runner.ts` | Long-running per-user sequence workflow. |
| `apps/trigger/src/tasks/upgrade-sequence-discover.ts` | Periodic discovery of upgrade sequence entries. |
| `apps/back/routes/obsidian.ts` | Triggers onboarding sequence on Obsidian connect. |
| `packages/auth/auth.ts` | Triggers welcome/onboarding sequences on signup/connect. |
| `docker-compose.yml` | Self-hosted Trigger.dev stack + DBB services. |
| `docker/trigger.env` | Trigger.dev runtime configuration for self-host. |

## Main Flows

### Digest delivery

1. Trigger.dev runs `digest-hourly` on the hour.
2. The task generates daily digests (idempotent per user/day).
3. The task sends due digests using timezone-aware checks.

### Email sequences

1. Backend creates `email_sequence_states` rows on signup or integration connect.
2. Backend triggers `email-sequence-runner` with `{ userId, sequenceName }`.
3. The runner waits until the next step is due and sends the email.
4. Exit conditions are checked before each send.

### Upgrade discovery

1. `upgrade-sequence-discover` runs hourly.
2. It inserts upgrade sequence states for eligible users.
3. It triggers `email-sequence-runner` for each new entry.

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

## Configuration

- `TRIGGER_PROJECT_REF` (required for Trigger.dev config)
- `TRIGGER_SECRET_KEY` (required to trigger runs from backend)
- `TRIGGER_API_URL` (required for self-hosted Trigger.dev)
- `EMAIL_SEQUENCES_ENABLED` (default `true`)
