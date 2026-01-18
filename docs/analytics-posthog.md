# PostHog analytics

## Purpose
- Capture onboarding and integration milestones across the frontend and backend.
- Keep behavioral analytics privacy-safe by avoiding note content in event payloads.
- Use a small, consistent event vocabulary that is easy to query in PostHog.

## Configuration
### Frontend (Vite)
- `VITE_POSTHOG_KEY` — PostHog project API key.
- `VITE_POSTHOG_HOST` — PostHog ingestion host, default `https://app.posthog.com`.

### Backend (Hono)
- `POSTHOG_API_KEY` — PostHog project API key.
- `POSTHOG_HOST` — PostHog ingestion host, default `https://app.posthog.com`.

## Event naming and properties
- Event names use Sentence case (example: `Notion sync completed`).
- Only two events are emitted:
  - `Notion sync completed` (properties: `source_kind`, `databases_synced`, `documents_imported`).
  - `Obsidian sync batch completed` (properties: `source_kind`, `connection_id`, `item_count`, `accepted`, `rejected`).
- Avoid sending note titles or note content.

## Implemented events
- `Notion sync completed` (backend sync route)
- `Obsidian sync batch completed` (backend sync batch route)

## Main files
| File | Responsibility |
| --- | --- |
| `apps/front/src/lib/posthog-client.ts` | Initialize PostHog (client helper shared by the frontend). |
| `apps/front/src/index.tsx` | Initialize PostHog and identify users once sessions resolve. |
| `apps/back/utils/posthog-client.ts` | Backend PostHog client and capture helper. |
| `apps/back/routes/notion.ts` | Capture Notion sync events. |
| `apps/back/routes/obsidian.ts` | Capture Obsidian sync batch event. |

## Privacy notes
- No raw note content or titles are sent to PostHog.
- Use counts, statuses, and ids only when necessary for analytics.
