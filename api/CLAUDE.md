# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm --filter api lint          # Biome ci: lint + format check + import-sort check (src/ and tests/)
pnpm --filter api test          # run all tests (Vitest)
pnpm --filter api typecheck     # tsc --noEmit
pnpm --filter api ci:checks     # lint + typecheck + test in one shot
pnpm --filter api build         # compile to dist/
pnpm --filter api start         # node dist/index.js
```

To run a single test file:

```bash
pnpm --filter api test tests/endpoints/registerProject.test.ts
```

## Required Environment Variables

| Variable        | Description                        |
| --------------- | ---------------------------------- |
| `DATABASE_PATH` | Absolute path to the SQLite file   |
| `PORT`          | HTTP port (integer, 1–65535)       |

`loadConfig()` in `src/config.ts` throws on startup if either is missing or invalid.

## Architecture

Three-layer: **endpoints → use-cases → repositories**. Each layer receives `db`
(a `better-sqlite3` `Database` instance) explicitly — no singletons, no globals.

- **Endpoints** (`src/endpoints/`) — Fastify plugin functions, one per API endpoint; validate
  request shape via JSON Schema, delegate to use-cases, map results to HTTP status codes.
- **Use-cases** (`src/use-cases/`) — business logic; one class per use case (e.g.
  `RegisterProject`, `ListProjects`), with `run()` as the single public method. Each use-case
  class takes a constructor-injected repository, calls repository functions, and returns typed
  result objects (e.g. `RegisterProjectResult`).
- **Repositories** (`src/repositories/`) — raw SQL only; accept and return plain objects
  (`ProjectRow`).

`buildApp(db, opts)` in `src/app.ts` wires all endpoints together and runs migrations.
`src/index.ts` is the process entry point: loads config, creates the DB, calls `buildApp`,
and starts listening.

## Testing Conventions

Tests use `fastify.inject()` against a real `better-sqlite3` in-memory database — no mocking of
internal layers. Each test file creates its own `Database(':memory:')` and `buildApp` instance;
`afterEach` closes the app.

## Key Conventions

- Project IDs are server-assigned with `nanoid`, prefixed `proj_`.
- Schema is managed via `@blackglory/better-sqlite3-migrations`. Migrations live in `src/db/migrations.ts`;
  `migrateDatabase(db)` runs them at startup. Add new migrations as versioned entries with `up`/`down` SQL.
- The `db` instance is passed down through Fastify plugin options, not imported as a
  module-level singleton.
