# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run lint          # Biome lint (src/ and tests/)
npm run test          # run all tests (Vitest)
npm run typecheck     # tsc --noEmit
npm run build         # compile to dist/
npm run start         # node dist/index.js
```

To run a single test file:

```bash
npx vitest run tests/routes/projects.test.ts
```

## Required Environment Variables

| Variable        | Description                        |
| --------------- | ---------------------------------- |
| `DATABASE_PATH` | Absolute path to the SQLite file   |
| `PORT`          | HTTP port (integer, 1–65535)       |

`loadConfig()` in `src/config.ts` throws on startup if either is missing or invalid.

## Architecture

Three-layer: **routes → services → repositories**. Each layer receives `db`
(a `better-sqlite3` `Database` instance) explicitly — no singletons, no globals.

- **Routes** (`src/routes/`) — Fastify plugin functions; validate request shape via JSON Schema,
  delegate to services, map `ProjectResult` to HTTP status codes.
- **Services** (`src/services/`) — business logic; call repository functions and return typed
  result objects (e.g. `ProjectResult`).
- **Repositories** (`src/repositories/`) — raw SQL only; accept and return plain objects
  (`ProjectRow`).

`buildApp(db, opts)` in `src/app.ts` wires all routes together and runs migrations.
`src/index.ts` is the process entry point: loads config, creates the DB, calls `buildApp`,
and starts listening.

## Testing Conventions

Tests use `fastify.inject()` against a real `better-sqlite3` in-memory database — no mocking of
internal layers. Each test file creates its own `Database(':memory:')` and `buildApp` instance;
`afterEach` closes the app.

`POST /api/projects` returns:

- `201 { projectId }` — new project created
- `409 { projectId, message }` — name already exists (idempotent: returns the existing ID)
- `400` — missing or empty `name`

## Key Conventions

- Project IDs are server-assigned with `nanoid`, prefixed `proj_`.
- Schema is managed via `@blackglory/better-sqlite3-migrations`. Migrations live in `src/db/migrations.ts`;
  `migrateDatabase(db)` runs them at startup. Add new migrations as versioned entries with `up`/`down` SQL.
- The `db` instance is passed down through Fastify plugin options, not imported as a
  module-level singleton.
