# Cloudflare Migration (Front + Back)

This document defines the migration path from Vercel to Cloudflare for `apps/front` and `apps/back`, while keeping PostgreSQL on the existing VPS.

## Target architecture

- `apps/front` deployed as a Cloudflare Worker with static assets (`dist`) and SPA fallback routing.
- `apps/back` deployed as a Cloudflare Worker (Hono/oRPC API).
- PostgreSQL remains on the VPS and is accessed through Cloudflare Hyperdrive.
- Trigger jobs remain unchanged during this migration.

## Main files

| File | Responsibility |
| --- | --- |
| `apps/front/cloudflare-worker.ts` | Serves static assets and rewrites extensionless 404s to `/index.html` for SPA routes. |
| `apps/front/wrangler.jsonc` | Front Worker config (entrypoint, assets binding, compatibility date). |
| `apps/front/package.json` | Cloudflare deploy scripts for front (`cf:deploy`, `cf:dev`, `cf:deploy:dry-run`). |
| `apps/back/cloudflare-worker.ts` | Worker entrypoint that maps Cloudflare bindings into `process.env` and lazy-loads Hono server. |
| `apps/back/wrangler.jsonc` | API Worker config, Hyperdrive bindings, Smart Placement, and base vars. |
| `apps/back/package.json` | Cloudflare deploy scripts for back (`cf:deploy`, `cf:dev`, `cf:types`, `cf:deploy:dry-run`). |
| `package.json` | Monorepo convenience deploy scripts (`cf:deploy:*`). |

## Deployment flow

1. Build and deploy API Worker (`apps/back`).
2. Build and deploy Front Worker (`apps/front`) with `VITE_API_URL` pointing to API Worker URL/custom domain.
3. Update DNS/custom domains after smoke tests pass.

## Hyperdrive setup

Create two Hyperdrive configs for the VPS Postgres:

1. Realtime (no cache):
```bash
npx wrangler hyperdrive create dbb-realtime \
  --connection-string="postgres://USER:PASSWORD@HOST:PORT/DB?sslmode=require" \
  --caching-disabled=true
```

2. Cached (read optimization):
```bash
npx wrangler hyperdrive create dbb-cached \
  --connection-string="postgres://USER:PASSWORD@HOST:PORT/DB?sslmode=require" \
  --max-age=120 \
  --swr=30
```

Then put the returned IDs in `apps/back/wrangler.jsonc`:
- `REPLACE_WITH_HYPERDRIVE_REALTIME_ID`
- `REPLACE_WITH_HYPERDRIVE_CACHED_ID`

Current backend wiring uses `HYPERDRIVE_REALTIME` by default for safety (strong consistency on request paths). Cached Hyperdrive can be adopted incrementally for explicitly read-only paths.

## Required Worker secrets/vars

Set all runtime secrets from your current backend deployment as Worker secrets/vars (Better Auth, Resend, OAuth, Polar, Notion, Sentry, etc.).

Examples:
```bash
cd apps/back
npx wrangler secret put BETTER_AUTH_SECRET
npx wrangler secret put RESEND_API_KEY
npx wrangler secret put GOOGLE_CLIENT_SECRET
npx wrangler secret put NOTION_CLIENT_SECRET
```

Set non-secret vars in `apps/back/wrangler.jsonc` under `vars` (or with `wrangler deploy --var ...` if preferred):
- `FRONTEND_URL`
- `BACKEND_URL`
- `DEPLOYMENT_MODE=cloud`
- `NODE_ENV=production`

## CLI runbook

Inventory current deploy environment:
```bash
vercel whoami
npx wrangler whoami
```

Deploy backend:
```bash
bun --filter @daily-brain-bits/back run cf:deploy
```

Build and deploy frontend:
```bash
# Set API URL at build time for front build
cd apps/front
VITE_API_URL="https://api.your-domain.com" bun run cf:deploy
```

## Rollback

If Cloudflare deploy is unhealthy:

1. Keep DNS/custom domain pointing to Vercel.
2. Fix Worker config/secrets.
3. Redeploy Cloudflare and retry cutover.

No schema/data rollback is required because database stays on the VPS.

## Trigger migration posture

Deploying front/back to Cloudflare does not block future migration from Trigger.dev to Cloudflare Queues/Jobs. To reduce lock-in risk, keep orchestration behind internal domain functions in `apps/back`, and make task providers thin adapters.
