# Plan

Unify Notion OAuth handling so both “Login with Notion” and “Connect Notion” end up storing the same access/refresh tokens in one canonical place, and the app can reliably determine whether a user has an active Notion connection.

## Scope
- In: align auth + onboarding flows, pick canonical token storage, persist Notion OAuth tokens + metadata consistently, update status/connect UX, add refresh/revoke handling.
- Out: implementing full Notion sync workers/webhooks; redesigning integrations data model beyond what’s needed for Notion OAuth storage consistency.

## Files (added, updated, deleted)
- Add: `.plan/unify-notion-oauth-storage.md`
- Update: `apps/front/src/routes/(unauth)/login.tsx`
- Update: `apps/front/src/routes/(app)/onboarding/configure-notion.tsx`
- Update: `packages/auth/auth.ts`
- Update: `apps/back/app.ts`
- Update: `apps/back/routes/notion.ts`
- Update (optional): `apps/back/integrations/notion-oauth.ts`

## Nomenclature
- **Auth Notion account**: Better Auth `account` row with `providerId = "notion"`.
- **Notion integration connection**: `integration_connections` row with `kind = "notion"` used by DBB integrations.
- **Canonical token store**: the single DB location considered the source of truth for Notion `access_token` / `refresh_token`.

## UX
- “Login with Notion” should result in Notion showing as “Connected” on `/(app)/onboarding/configure-notion` without requiring a second OAuth prompt.
- “Connect to Notion” on `configure-notion` should work for users logged-in via Google/email/etc and end in the same storage and status behavior as Notion-login.

## Data flow & db updates

Pick one canonical storage approach and make both flows converge on it:
- Option A (recommended): canonical store = Better Auth `account` table; `integration_connections` stores only the Notion external ID and config/scope, and backend looks up tokens from `account`.
- Option B: canonical store = `integration_connections.secretsJsonEncrypted`; Better Auth token writes are mirrored into `integration_connections` via `databaseHooks.account.*`.

Regardless of option:
- Ensure the Notion identifier used as `integration_connections.accountExternalId` is stable (ideally `bot_id` from Notion token response; otherwise `workspace_id`).
- Store/refresh `refresh_token` and rotate tokens on refresh.
- On Notion API 401/403, mark `integration_connections.status = "revoked"` and prompt reconnect.

## Action items
[ ] Audit Better Auth Notion provider fields to confirm what is stored in `account.accountId` / token columns for Notion.
[ ] Choose canonical token storage (Option A vs Option B) and document it in code (types + helpers) to prevent future divergence.
[ ] Update `apps/front/src/routes/(app)/onboarding/configure-notion.tsx` to use `authClient.linkSocial({ provider: "notion", callbackURL })` instead of the custom `/api/integrations/notion/*` redirect flow (or keep it as fallback behind a feature flag during migration).
[ ] Add Better Auth `databaseHooks.account.create/update` in `packages/auth/auth.ts` (provider `"notion"`) to upsert/refresh the Notion integration connection (and optionally fetch minimal display metadata).
[ ] Update `apps/back/routes/notion.ts` “connected” resolution to use the canonical token store and to ignore stale/invalid connections (`status != "active"`).
[ ] Implement Notion token refresh (`grant_type=refresh_token`) + DB update path and call it when tokens are expired/invalid.
[ ] Add an integration “disconnect”/“reconnect” endpoint and wire UI affordances (revoked state) in `configure-notion`.
[ ] Validate end-to-end locally: sign in with Notion → see connected; sign in with Google → connect via button → see connected; simulate revoked token and confirm status changes.

## Open questions
- Should DBB support multiple Notion workspaces per user (multiple `integration_connections` of kind `notion`), or enforce one active connection?
- For Notion authorization, do we require `owner=workspace` semantics, or is the default acceptable for DB access?
- Where should encryption-at-rest live for integration secrets (`integration_connections.secretsJsonEncrypted`) given Better Auth can encrypt OAuth tokens in `account`?

