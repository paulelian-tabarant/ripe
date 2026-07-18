# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm --filter ./cli lint        # Biome ci: lint + format check + import-sort check (src/ and tests/)
pnpm --filter ./cli build       # tsc -p tsconfig.build.json → dist/
pnpm --filter ./cli test        # vitest run (all tests under tests/)
pnpm --filter ./cli typecheck   # tsc --noEmit (includes src + tests)
pnpm --filter ./cli ci:checks   # lint + typecheck + test in one shot
pnpm --filter ./cli cli -- <command-name>   # build, then invoke the CLI, e.g. `init`

# Run a single test file
pnpm --filter ./cli exec vitest run tests/commands/init.test.ts
```

## Architecture

This is the `ripe` CLI — one command today: `ripe init` (prompts for the server URL).

**Entry point**: `src/index.ts` — parses `process.argv`, routes to command handlers via
`src/cli.ts`, calls `process.exit`.

**Layer split**:

- `src/commands/` — orchestration logic, returns `{ status: 'success' | 'error' }`, never calls
  `process.exit` directly. Accepts injected `cwd` and `promptFn` for testability. Exit codes are
  not this layer's concern — mapping `status` to a process exit code happens in `src/cli.ts`.
- `src/lib/api.ts` — raw HTTP calls (no dependency, uses `node:http`/`node:https` directly).
  Returns typed result objects.
- `src/lib/config.ts` — writes `.ripe/config.json` to disk.

**`ripe init` flow**: checks for existing `.ripe/config.json` → POST `/api/projects` with
`{ name: basename(cwd) }` → on 201 write config; on 409 prompt user to attach to existing
project.

**Testing**: Vitest + `nock` for HTTP interception. Tests create a real `tmpdir` and inject
`promptFn` to avoid stdin. Network is disabled per-test via `nock.disableNetConnect()`.

**Build output**: `dist/` (ESM, `"type": "module"`). Published to GitHub Packages registry as
`@paulelian-tabarant/ripe`.
