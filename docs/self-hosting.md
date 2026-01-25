# Self-Hosting (Docker Compose)

## Summary

- One-command self-hosting via `docker-compose.yml` with Postgres, backend, frontend, and Trigger.dev (self-hosted).
- Uses **Resend** for email delivery and grants **Pro features** automatically in self-hosted mode.
- `db:push` runs once on first boot to initialize schema.

## Scope

- In scope: local or single-node self-hosting, DB bootstrap, Trigger.dev platform, Resend setup, and core app configuration.
- Out of scope: high-availability, multi-region, or managed database setup.

## Main Files

| Path | Responsibility |
|------|----------------|
| `docker-compose.yml` | Full stack: DB, backend, frontend, Trigger.dev services. |
| `docker/back-app.dockerfile` | Bun-based backend container. |
| `docker/front-app.dockerfile` | Frontend build + Nginx SPA host. |
| `docker/nginx.conf` | SPA routing fallback. |
| `docker/app.env` | App runtime env (self-host defaults). |
| `docker/trigger.env` | Trigger.dev runtime env (self-host defaults). |
| `apps/back/utils/entitlements.ts` | Deployment mode + Pro entitlements. |
| `apps/back/routes/settings.ts` | Capabilities endpoint for the UI. |

## Quick Start

1. Copy and edit env files:
   - `docker/app.env` (set `BETTER_AUTH_SECRET`, `RESEND_API_KEY`, `TRIGGER_SECRET_KEY`)
   - `docker/trigger.env` (replace secrets like `MAGIC_LINK_SECRET`, `SESSION_SECRET`, `ENCRYPTION_KEY`)
2. Start the stack:
   - `docker compose up --build`
3. Open the app:
   - Frontend: `http://localhost:3000`
   - Backend: `http://localhost:3001`
   - Trigger.dev UI: `http://localhost:3040`

## Environment Variables (Minimal)

**App (`docker/app.env`)**
- `DEPLOYMENT_MODE=self-hosted`
- `DATABASE_URL`
- `BETTER_AUTH_SECRET`
- `RESEND_API_KEY`
- `TRIGGER_SECRET_KEY`
- Optional: `NOTION_CLIENT_ID`, `NOTION_CLIENT_SECRET` (only if you want Notion OAuth)

**Trigger.dev (`docker/trigger.env`)**
- `DATABASE_URL`, `DIRECT_URL`
- `MAGIC_LINK_SECRET`, `SESSION_SECRET`, `ENCRYPTION_KEY`
- `PROVIDER_SECRET`, `COORDINATOR_SECRET`

## Trigger.dev Task Deployment

Trigger.dev runs the platform in Docker, but the **task definitions** still need to be deployed from this repo:

1. Set `TRIGGER_PROJECT_REF` in your shell (or CI).
2. Deploy tasks from `apps/trigger`:
   - `npx trigger.dev@latest deploy --self-hosted --api-url http://localhost:3040`
3. Ensure `TRIGGER_SECRET_KEY` in `docker/app.env` matches the project secret from Trigger.dev.

## Notes

- Self-hosted mode disables Polar billing and treats all users as Pro.
- Email sending uses Resend; configure a verified sender if you want production deliverability.
