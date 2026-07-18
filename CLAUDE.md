# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Project Is

A telemetry system for tracking custom skill invocations in Claude Code projects. Target design
(see `docs/spec/` and `docs/architecture/decisions/`): a CLI client (`ripe`) runs via the
`SessionEnd` hook, parses the session transcript, and POSTs events to a Fastify server, with a
React dashboard displaying skill usage rankings.

Current state: `cli/` only implements `ripe init` (project registration) — transcript parsing and
event submission aren't built yet. `web/` is a walking skeleton with no feature functionality yet.
See each package's own CLAUDE.md for what's actually there.

## Package Structure (pnpm workspace)

- `api/` — Fastify + SQLite backend. See [`api/CLAUDE.md`](api/CLAUDE.md) for architecture and conventions.
- `cli/` — CLI script (`ripe init` and `ripe sync`). See [`cli/CLAUDE.md`](cli/CLAUDE.md) for details.
- `web/` — React + Vite SPA, served as static files by the server in production. See
  [`web/CLAUDE.md`](web/CLAUDE.md) for architecture and conventions.

## Root Commands

```bash
pnpm --filter api test
pnpm --filter ./cli test
pnpm --filter web test
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

## Tool Usage

- **Project skills over built-in equivalents**: check `.claude/skills/` before using a built-in
  Claude skill for the same purpose (e.g. review, PR triage, PR recap). Use the project skill.
- **Commands run from repo root** via `pnpm --filter <package> <script>` (e.g.
  `pnpm --filter ./cli ci:checks`). Never `cd` into a workspace and run `npm`/`pnpm` directly there.
- **Subagents are read-only by default**: when dispatching a subagent for exploration or review,
  it must only report findings — never edit code — unless explicitly instructed to make changes.

## Cross-Cutting Architecture Decisions

**Skill IDs**: server-assigned, not client-generated
([ADR-012](docs/architecture/decisions/ADR-012-server-managed-skill-ids.md)). The client caches
`(skill_name → skill_id)` locally. If the cache is lost, re-registering recreates it.

**Deduplication key**: `(session_id, tool_use_id)` — re-submitting the same transcript is safe.

**Namespaced skills** (containing `:`): skipped by the client with a stderr warning. Only
`.claude/skills/` are tracked — not third-party plugins.

**No authentication** in MVP. The server URL is the only access control.

## Deployment

Railway Hobby plan. Two services: staging (auto-deploys on merge to `main`, database resets each
deploy) and production (manual trigger from Railway dashboard). Main branch is protected. CI on
every push runs lint, type checks, and tests.
