# Coding Standards

This file documents coding standards for this repository: style and structure rules a
contributor should follow when writing new code. It supplements — it does not replace — the
package-level `CLAUDE.md` files (root, `cli/CLAUDE.md`, `api/CLAUDE.md`), which describe
architecture, commands, and project-specific conventions in more depth.

## General

These rules apply across the whole workspace (`api/` and `cli/`), which share the root
`biome.json` and `tsconfig.base.json`.

- **TypeScript strictness**: `strict: true` is enabled at the base and inherited by both
  packages. Don't weaken it locally (no `any` escape hatches, no `@ts-ignore`).
- **Explicit return types**: Biome's `nursery.useExplicitType` rule is set to `error`. Every
  function/method must declare an explicit return type — don't rely on inference.
- **Formatting**: 2-space indent, single quotes, semicolons always, trailing commas everywhere,
  100-character line width, imports auto-organized (`assist.actions.source.organizeImports`).
  Run `biome lint` (or your editor's Biome integration) rather than hand-formatting.
- **No unused exports**: keep modules' public surface limited to what's actually consumed;
  Biome's recommended rule set flags unused variables/imports — treat unused exports the same
  way during review.
- **Testing philosophy**: prefer real dependencies over mocks wherever the codebase already does
  (e.g. an in-memory SQLite database, a real temp directory, `nock` for HTTP boundary
  interception rather than mocking internal modules). Reach for a mock only when there's no
  practical way to exercise the real dependency in a unit test.
- **Before considering any task done**, run that package's own `lint`, `typecheck`, and `test`
  scripts (`pnpm --filter <pkg> lint|typecheck|test`). Before finishing a feature branch, run the
  full pipeline listed in the root `CLAUDE.md`.

## `cli/`

- **Layer split**: `src/commands/` holds orchestration logic; `src/lib/` holds single-purpose
  helpers (HTTP calls, config file I/O). Don't mix the two — a command function should read as a
  sequence of calls into `lib/`, not inline `fs`/`fetch` logic.
- **Dependency injection for testability**: side-effecting inputs (current working directory,
  interactive prompts) are passed in as optional parameters with real defaults (see
  `InitOptions.currentDirectoryName`, `InitOptions.promptFn` in `src/commands/init.ts`), so tests
  can inject fakes instead of touching the real filesystem or stdin.
- **`process.exit` only in `src/index.ts`**: command functions return a typed result
  (`{ exitCode: 0 | 1 }`) instead of exiting directly. Only the entry point interprets that
  result and calls `process.exit`.
- **Error handling**: expected failure paths (invalid URL, server unreachable, HTTP error) are
  handled with `try`/`catch` and turned into a returned `exitCode` plus a `console.error` message
  — they are not left to propagate as uncaught exceptions. Reserve thrown errors for truly
  unexpected conditions.
- **Typed results over ad hoc shapes**: functions that call out to the network return a typed
  result object (e.g. `ProjectRegistrationResult`) rather than a bare `Response` or `unknown`.

## `api/`

- **Three-layer split**: routes → services → repositories. Routes validate the request shape
  (JSON Schema) and translate results to HTTP status codes; services hold business logic;
  repositories hold raw SQL only. Don't skip a layer (no SQL in routes, no HTTP concerns in
  services).
- **`db` is passed explicitly, never a singleton**: every layer that needs the
  `better-sqlite3` `Database` instance receives it through its constructor or Fastify plugin
  options (see `ProjectRepository`, `buildApp(db, opts)`). Don't import a module-level `db`.
- **Typed result objects instead of thrown control-flow errors**: expected outcomes (e.g.
  "project already exists") are represented as typed return values (e.g.
  `RegisterProjectResult`), which routes map to status codes. Reserve `throw` for genuinely
  exceptional/startup conditions (e.g. `loadConfig()` throwing on missing env vars).
- **No `console.*` in `src/`**: application code communicates via Fastify's request/reply and
  return values, not console output; logging belongs to Fastify's own logger, not ad hoc
  `console` calls.
- **Migrations**: schema changes go in `src/db/migrations.ts` as versioned entries with `up`/
  `down` SQL, applied via `migrateDatabase(db)`. Never hand-edit the schema outside a migration.
