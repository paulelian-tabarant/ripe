# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Project Is

A telemetry system for tracking custom skill invocations in Claude Code projects. A CLI client
(`ripe`) runs via the `SessionEnd` hook, parses the session transcript, and POSTs events to a
Fastify server. A React dashboard displays skill usage rankings.

## Package Structure (pnpm workspace)

- `api/` — Fastify + SQLite backend. See [`api/CLAUDE.md`](api/CLAUDE.md) for architecture and conventions.
- `cli/` — CLI script (`ripe init` and `ripe sync`). See [`cli/CLAUDE.md`](cli/CLAUDE.md) for details.
- `web/` — React + Vite SPA, served as static files by the server in production.

## Root Commands

```bash
pnpm --filter api test
pnpm --filter ./cli test
pnpm --filter web test
pnpm test:e2e          # Playwright, from repo root

pnpm lint:md           # Markdown lint
```

Each package has its own `npm run test` (Vitest), `npm run typecheck`, and `npm run ci:checks`
(lint + typecheck + test in one shot).

After every coding task, favor `pnpm --filter <package> ci:checks` (`api`, `./cli`, or `web`) for
the package(s) you touched before considering the task done.

At the end of every feature branch, run the full pipeline before considering it ready:

```bash
pnpm lint:md
pnpm --filter api ci:checks
pnpm --filter ./cli ci:checks
```

All checks must pass with zero errors before marking the feature complete.

## Cross-Cutting Architecture Decisions

**Skill IDs**: server-assigned, not client-generated (ADR-015). The client caches
`(skill_name → skill_id)` locally. If the cache is lost, re-registering recreates it.

**Deduplication key**: `(session_id, tool_use_id)` — re-submitting the same transcript is safe.

**Namespaced skills** (containing `:`): skipped by the client with a stderr warning. Only
`.claude/skills/` are tracked — not third-party plugins.

**No authentication** in MVP. The server URL is the only access control.

## Deployment

Railway Hobby plan. Two services: staging (auto-deploys on merge to `main`, database resets each
deploy) and production (manual trigger from Railway dashboard). Main branch is protected. CI on
every push runs lint, type checks, and tests.
