# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm --filter api lint          # Biome ci: lint + format check + import-sort check (src/ and tests/)
pnpm --filter api test          # run all tests (Vitest)
pnpm --filter api typecheck     # tsc --noEmit
pnpm --filter api ci:checks     # lint + typecheck + test + build + smoke, in one shot
pnpm --filter api build         # compile to dist/
pnpm --filter api start         # node dist/index.js
pnpm --filter api smoke         # boots dist/index.js against a scratch DB, hits GET /api/health
```

`smoke` (`scripts/smoke.mjs`) exists to catch build-output-only bugs that lint/typecheck/test
can't see — e.g. a `tsconfig.json` `paths` alias that type-checks fine but isn't rewritten by
`tsc` in the emitted `dist/`, so it only fails once the built server actually boots (see
`cli/STANDARDS.md`'s "Imports" section for the same failure mode, hit for real in `cli/`).

To run a single test file:

```bash
pnpm --filter api test tests/endpoints/project.endpoints.test.ts
```

## Required Environment Variables

| Variable        | Description                        |
| --------------- | ---------------------------------- |
| `DATABASE_PATH` | Absolute path to the SQLite file   |
| `PORT`          | HTTP port (integer, 1–65535)       |

`loadConfig()` in `src/infrastructure/config.ts` throws on startup if either is missing or invalid.

## Architecture

Three-layer: **endpoints → use-cases → repositories**, plus a **domain** layer for entity
behavior. Each layer receives `db` (a `better-sqlite3` `Database` instance) explicitly — no
singletons, no globals.

- **Endpoints** (`src/endpoints/`) — Fastify plugin functions, one per API endpoint; validate
  request shape via JSON Schema, delegate to use-cases, map results to HTTP status codes.
- **Use-cases** (`src/core/use-cases/`) — business logic; one class per use case (e.g.
  `RegisterProject`, `ListProjects`), with `run()` as the single public method. Each use-case
  class takes a constructor-injected repository, calls repository functions, and returns typed
  result objects (e.g. `RegisterProjectResult`).
- **Repositories** (`src/infrastructure/*.repository.ts`) — raw SQL only; accept and return plain
  objects (`ProjectRow`).
- **Domain** (`src/core/domain/`) — entity classes with a private constructor and a validating static
  factory. External input that needs deriving/validating before it can be used gets its own value
  object with a private constructor and a `resolve`-style factory (e.g.
  `ProjectRepoReference.resolve(remoteUrl): ProjectRepoReference | InvalidRemoteUrlError`), kept
  in its own file; the entity's own factory then takes that already-validated value object instead
  of a raw external value, so it can't fail (e.g. `Project.create(name, repoReference)` is
  infallible — an invalid `Project` simply can't be constructed in the first place). Reserved for
  invariants intrinsic to the entity or its inputs; an application-level workflow step belongs in
  a use-case instead.

`buildApp(db, opts)` in `src/app.ts` wires all endpoints together. `src/index.ts` is the process
entry point: loads config, creates the DB, runs migrations, calls `buildApp`, and starts
listening.

### Directory Structure

```text
src/
  app.ts                    # buildApp(db, opts) — wires endpoints, no DB setup/migration
  index.ts                  # process entry point — DB creation, migration, buildApp, listen
  core/
    domain/                 # entity classes and value objects (Project, ProjectRepoReference)
    use-cases/              # one class per use case (RegisterProject, ListProjects)
  endpoints/
    contracts/              # wire-shape types only, exported to cli/web (health.ts, projects.ts)
    *.endpoints.ts           # Fastify plugin functions (health.endpoints.ts, project.endpoints.ts)
  infrastructure/
    config.ts                # loadConfig()
    *.repository.ts          # raw-SQL repositories (project.repository.ts)
    db/
      migrations.ts           # versioned up/down migration entries
tests/
  config.test.ts             # the one pure unit test
  endpoints/*.endpoints.test.ts  # one test file per endpoints file, fastify.inject() + real DB
  helpers/                    # test-only utilities (create-test-db.ts, post-projects.ts)
```

See [`api/STANDARDS.md`](STANDARDS.md) for the naming-convention rule behind `*.repository.ts`/
`*.endpoints.ts`/`*.endpoints.test.ts`.

## Testing Conventions

Tests use `fastify.inject()` against a real `better-sqlite3` in-memory database — no mocking of
internal layers. Each test file creates its own `Database(':memory:')` and `buildApp` instance;
`afterEach` closes the app.

## Key Conventions

- Project IDs are server-assigned with `nanoid`, prefixed `proj_`.
- Schema is managed via `@blackglory/better-sqlite3-migrations`. Migrations live in
  `src/infrastructure/db/migrations.ts`; `src/index.ts` (and each test's `createTestDb()` helper)
  calls `migrate(db, migrations)` directly at startup — no wrapper function, since the call is a
  single line with no logic of its own. Add new migrations as versioned entries with `up`/`down`
  SQL.
- The `db` instance is passed down through Fastify plugin options, not imported as a
  module-level singleton.

See [`api/STANDARDS.md`](STANDARDS.md) for style and testing conventions specific to this package.
