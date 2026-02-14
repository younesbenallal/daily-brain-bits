# Onboarding flow

This document describes the current onboarding flow in the frontend (`apps/front`) and how it maps to backend state (`apps/back`).

## Goals

- Get the user to the first “aha”: seeing a first digest preview in-app.
- Keep friction low: collect only what’s needed, and defer preferences.
- Avoid dead-ends: make it hard to proceed with an empty source selection and provide recovery actions if syncing stalls.

## Route order (happy path)

1. `/login`
   - Supports email/password signup + login and social login (Google/Notion).
2. `/onboarding/choose-source`
   - User chooses Notion or Obsidian.
3. `/onboarding/configure-notion` or `/onboarding/configure-obsidian`
   - Notion: connect via OAuth and select at least 1 database.
   - Obsidian: install plugin, generate token, and wait for first sync.
4. `/onboarding/onboarding-loading`
   - “Syncing” UI (still uses the existing lightweight tour/timers).
   - Polls `/rpc/onboarding.status`.
   - Backend creates the seed digest after integration sync completion and only when no active sync run is still `running`.
5. `/onboarding/preview`
   - Shows the first digest preview in-app (uses `digest.today`).
6. `/onboarding/preferences` (optional)
   - Lets users adjust timezone/send hour and other settings.
7. `/onboarding/onboarding-final`
   - Confirms setup, shows email schedule summary, and completes onboarding.

## Backend state

`user.showOnboarding` is the single flag that gates onboarding. It is read from the session when available, and re-confirmed via `/rpc/onboarding.status` when needed.

Completion is done via `/rpc/onboarding.complete`, which flips `user.showOnboarding` to `false`.

## Notion selection guard

Notion onboarding requires at least one selected database before continuing. This prevents users from entering the loading/seed phase without any documents to sync.

## Stuck-state recovery

If the onboarding “loading” step doesn’t observe any synced documents, the UI surfaces a troubleshooting block that sends the user back to source setup.
