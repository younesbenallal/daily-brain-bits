# Self-Hosting (Docker Compose)

## Summary

- One-command self-hosting via `docker-compose.yml` with Postgres, backend, frontend, and a cron container.
- Uses **Resend** for email delivery and grants **Pro features** automatically in self-hosted mode.
- `db:push` runs once on first boot to initialize schema.

## Scope

- In scope: local or single-node self-hosting, DB bootstrap, digest cron, Resend setup, and core app configuration.
- Out of scope: high-availability, multi-region, or managed database setup.

## Main Files

| Path | Responsibility |
|------|----------------|
| `docker-compose.yml` | Full stack: DB, backend, frontend, cron. |
| `docker/back-app.dockerfile` | Bun-based backend container. |
| `docker/front-app.dockerfile` | Frontend build + Nginx SPA host. |
| `docker/nginx.conf` | SPA routing fallback. |
| `docker/app.env` | App runtime env (self-host defaults). |
| `apps/back/domains/billing/entitlements.ts` | Deployment mode + Pro entitlements. |
| `apps/back/routes/settings.ts` | Capabilities endpoint for the UI. |

## Quick Start

1. Copy and edit env file:
   - `cp docker/app.env docker/app.env.local`
   - Edit `docker/app.env.local` and set `BETTER_AUTH_SECRET`, `RESEND_API_KEY`
2. Start the stack:
   - `docker compose up --build`
3. Open the app:
   - Frontend: `http://localhost:3000`
   - Backend: `http://localhost:3001`

## Environment Variables (Minimal)

**App (`docker/app.env`)**
- `DEPLOYMENT_MODE=self-hosted` (required)
- `DATABASE_URL` (auto-configured for Docker)
- `BETTER_AUTH_SECRET` (generate a random 32+ char string)
- `RESEND_API_KEY` (from resend.com)
- `RESEND_FROM` (verified sender email)
- Optional: `NOTION_CLIENT_ID`, `NOTION_CLIENT_SECRET` (only if you want Notion OAuth)

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Frontend  │────▶│   Backend   │────▶│  Postgres   │
│   (nginx)   │     │   (bun)     │     │             │
└─────────────┘     └─────────────┘     └─────────────┘
      :3000              :3001               :5432
                              │
                              ▼
                    ┌─────────────┐
                    │    Cron     │
                    │  (digests)  │
                    └─────────────┘
```

The `cron` container runs the digest generation and delivery script every hour. It uses the same backend image and shares the same env vars.

## Digest Delivery

Digest emails are sent automatically by the `cron` container which runs every hour:
- Generates daily digests for users whose local time matches their configured delivery hour
- Sends pending digests via Resend

No external scheduler (like Trigger.dev) is required for self-hosted deployments.

## Notes

- Self-hosted mode disables Polar billing and treats all users as Pro.
- Email sequences (welcome, onboarding) are disabled in self-hosted mode - only digest emails are sent.
- Email sending uses Resend; configure a verified sender for production deliverability.
