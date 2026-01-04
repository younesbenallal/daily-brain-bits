# AGENTS.md — Notionist Monorepo (Cursor Global Context)

## What this repo is
Notionist is a suite of productivity tools for knowledge-base apps (Notion, Obsidian, etc.). It currently includes:
* Notionist (Quick Add): an Electron “Spotlight/Raycast-like” app to search and create Notion pages quickly.
* Daily Brain Bits (DBB): connects to a user’s knowledge base and emails them daily “random” notes + optional AI-generated quizzes to improve long-term recall.

This repo is a monorepo containing the backend services + integrations + (for Obsidian) a community plugin.

## DBB: how it works (high level)
* User connects one (or more) source (Notion or Obsidian).
* We sync notes into our backend (full sync), keep them up-to-date, and store review history.
* Each day the backend selects \(n\) notes (spaced repetition + priority/deprioritize signals).
* Backend sends emails and (optionally) generates quizzes with an LLM.

### Integration model
* Obsidian: local plugin reads vault and pushes note content + metadata to backend (Obsidian is local-first).
* Notion: backend uses Notion API (OAuth) to pull pages/databases and convert content to markdown.

## Main features (DBB)
* Configure email frequency + number of notes/day
* Daily emails containing note content
* Prioritize / deprioritize notes (affects future selection)
* AI quizzes (Pro): hide 1–3 concepts, generate QCM-style questions
* (Planned) link suggestions

## Main features (Notionist / Quick Add)
* Global hotkey modal to search and open Notion pages
* Create pages in selected databases with property autocompletion
* (Planned) templates, multiple accounts, offline, page updates

## Technologies (current stack)
### Tooling
* Bun
* Turborepo

### Backend
* Hono
* oRPC + zod
* Drizzle (DB access)
* Better Auth (auth)

### Frontend
* React
* Tailwind CSS v4
* TanStack Router
* React Query (integrated with oRPC via `createORPCReactQueryUtils`)
* shadcn/ui using BaseUI (not Radix) for unstyled components

## Engineering conventions (Cursor should follow)
* Keep modules small and focused; split large files.
* Prefer shared domain types in `packages/core` and integration-specific adapters in `packages/integrations/*`.
* Sync is idempotent:
    * identify documents by `(userId, sourceKind, accountId, externalId)`
    * skip unchanged content via stable hashing
* Privacy is a product feature:
    * minimize data sent externally (especially to LLMs)
    * encryption at rest, plus user delete/export flows
* Handle third-party constraints explicitly:
    * Notion API pagination + 429 `Retry-After` backoff
    * Obsidian plugin must batch + debounce vault events

## Docs
- `docs/integrations-architecture.md` — Shared sync contract and integration architecture.
- `docs/integrations-notion.md` — Notion incremental database sync (cursor, rate limits, markdown).
- `docs/integrations-obsidian.md` — Obsidian plugin push sync (batching, local index, glob scope).

Todo list:
- [ ] Implement DB schema
- [ ] Build Notion integration (syncing)
- [ ] Build Obsidian integration (syncing)
- [ ] Build onboarding
