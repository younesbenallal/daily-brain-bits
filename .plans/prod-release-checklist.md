# Prod release manual verification checklist (DBB)

Use this as the “human QA” pass right before and right after deploying to production. Keep notes inline and link to screenshots/logs where useful.

## Release metadata

- Release date (UTC): `YYYY-MM-DD`
- Release version / git SHA: `________`
- Environments verified: `staging`, `production`
- Rollback plan owner: `________`

---

## 0) Preconditions (before you start clicking)

- [ ] Code freeze: no unreviewed changes pending for this release.
- [ ] `docs/pricing.md` matches the product you’re shipping (plans/limits/entitlements).
- [ ] Support inbox + error alerts are monitored for the first 24h post-launch.
- [ ] Test accounts ready:
  - [ ] Fresh email (never used before) for “new user” path.
  - [ ] Existing account for “upgrade/downgrade/cancel/reactivate” paths.
  - [ ] One account with Notion connected + a non-trivial dataset.
  - [ ] (If applicable) One account with Obsidian connected.

---

## 1) Auth & account lifecycle (staging first, then prod)

- [ ] Sign up
  - [ ] New user can create an account.
  - [ ] Email verification / magic link / OAuth callback (whatever you use) completes successfully.
  - [ ] Errors are friendly (invalid email, expired link, wrong code, etc.).
- [ ] Login / logout
  - [ ] Login works from a fresh browser session.
  - [ ] Logout fully clears session and protected routes are blocked.
- [ ] Password/session safety
  - [ ] Session persists across refresh and closes correctly on logout.
  - [ ] Account actions require auth (can’t be done logged out).
- [ ] Account deletion/export (privacy feature)
  - [ ] Export data works (or is clearly unavailable if not shipped).
  - [ ] Delete account works end-to-end and removes/invalidates integrations + scheduled jobs.

---

## 2) Onboarding flow & gating

- [ ] First-run onboarding
  - [ ] Routes progress as expected (no dead ends).
  - [ ] If a step is required (connect a source, pick cadence, etc.), skipping is prevented or clearly handled.
- [ ] Returning user
  - [ ] Returning user lands in the correct “home” experience.
  - [ ] App doesn’t re-run onboarding unexpectedly.

---

## 3) Integrations: Notion (and Obsidian if shipped)

### Notion

- [ ] Connect Notion
  - [ ] OAuth / token flow succeeds.
  - [ ] Source selection UI loads and is usable.
- [ ] Initial sync
  - [ ] Full sync starts and completes.
  - [ ] Progress UI behaves (no stuck spinner; errors are actionable).
  - [ ] Notes count is plausible compared to the source.
- [ ] Incremental update
  - [ ] Edit a note in Notion and confirm it updates in DBB after the expected delay.
  - [ ] Delete/archival behavior is correct (whatever your product promise is).
- [ ] Rate limits + partial failure
  - [ ] A simulated failure shows a clear message and a safe “retry” path.

### Obsidian (if applicable)

- [ ] Connect + authorize
- [ ] Push sync of a small batch
- [ ] Push sync of a large-ish batch (sanity on performance)
- [ ] Conflict handling (duplicate filenames / edits)

---

## 4) Daily/weekly/monthly digest behavior (end-to-end)

- [ ] Scheduling
  - [ ] User timezone is detected/selected correctly.
  - [ ] Cadence selection persists (daily/weekly/monthly).
  - [ ] “Next send” preview is correct for the timezone.
- [ ] Selection algorithm (product sanity)
  - [ ] Eligible notes exist; digest selects `n` notes.
  - [ ] Priority/deprioritize signals actually influence selection.
- [ ] Email delivery
  - [ ] Email is received in a real inbox (Gmail + one other provider if possible).
  - [ ] Subject/from/reply-to look correct.
  - [ ] Unsubscribe link works and updates preference.
  - [ ] Links in email point to production domain and open the intended note view.
  - [ ] Email renders well on mobile and desktop.
- [ ] “No notes” or “not connected” scenarios
  - [ ] User gets a helpful email or a helpful in-app state (whichever your promise is).

---

## 5) Billing & entitlements (Polar)

- [ ] Pricing page
  - [ ] Pricing copy matches `docs/pricing.md`.
  - [ ] Correct currency/period display (monthly/annual).
- [ ] Purchase / upgrade
  - [ ] Checkout completes successfully.
  - [ ] Post-checkout state updates (plan, limits, UI gating) without manual refresh (or with a single refresh if expected).
- [ ] Downgrade / cancel
  - [ ] Cancel takes effect on the correct boundary (immediate vs end-of-period).
  - [ ] Entitlements enforce correctly after downgrade/cancel.
- [ ] Webhooks
  - [ ] Subscription changes reflect in-app within expected time.
  - [ ] Failed payment / past due behavior is correct (access, messaging).

---

## 6) Admin/support operations (do this once in staging)

- [ ] Locate user by email and inspect status (plan, integrations connected, last sync, last digest).
- [ ] Refund/cancel flow is known and documented (even if done only in Polar dashboard).
- [ ] “Break glass” steps are documented:
  - [ ] Disable sending for a user.
  - [ ] Re-run a sync.
  - [ ] Re-run / re-schedule a digest job.

---

## 7) Observability & safety (production readiness)

- [ ] Error monitoring is live (Sentry or equivalent)
  - [ ] A test error shows up with source maps.
- [ ] Analytics is live (PostHog or equivalent)
  - [ ] Key events fire (signup, connect integration, sync complete, checkout success, digest opened).
- [ ] Logs
  - [ ] You can find logs for API requests + background jobs quickly.
- [ ] Background jobs
  - [ ] Trigger.dev (or your scheduler) is connected to prod and jobs are executing.
  - [ ] Retries/backoff behave sanely for transient failures.
- [ ] Database
  - [ ] Backups are enabled and restorable (confirm procedure, not necessarily a live restore).
  - [ ] Migrations are applied successfully and the app boots on a fresh deploy.
- [ ] Security basics
  - [ ] Production secrets are not present in client bundles.
  - [ ] Auth cookies/session config correct for HTTPS + your domain.

---

## 8) Deployment runbook (production)

- [ ] Pre-deploy
  - [ ] Verify the target git SHA / tag is what you intend to ship.
  - [ ] Confirm prod env vars/secrets are set (including third-party webhook signing secrets).
  - [ ] Confirm DNS/cert is valid for the prod domain.
- [ ] Deploy
  - [ ] Deploy backend + frontend.
  - [ ] Apply DB migrations (if not automatic).
- [ ] Post-deploy smoke (in prod)
  - [ ] App loads and health endpoint is OK (if you have one).
  - [ ] Sign up + login works.
  - [ ] Connect Notion works.
  - [ ] Billing checkout works (use a low-risk test path if available).
  - [ ] Trigger job executes (or can be manually triggered) and email sends.
- [ ] Rollback readiness
  - [ ] You know exactly how to roll back code.
  - [ ] You know what to do if a migration needs rollback/forward-fix.

---

## 9) Post-launch (first 24 hours)

- [ ] Monitor
  - [ ] Error rate, latency, and job failures for at least 1–2 hours after launch.
  - [ ] Payment failures + webhook delivery status.
  - [ ] Email delivery signals (bounces/complaints) and deliverability.
- [ ] Support loop
  - [ ] A quick way to respond to users (email + in-app messaging if any).
  - [ ] A simple triage rubric: P0 (can’t login / can’t pay / data loss), P1 (sync broken), P2 (UX issues).
- [ ] Confirm real users can complete the “happy path” without help:
  - [ ] Create account → connect Notion → sync → receive first digest → open note.

