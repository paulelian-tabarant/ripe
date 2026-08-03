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
pnpm --filter ./cli test tests/commands/init.test.ts
```

## Architecture

This is the `ripe` CLI — one command today: `ripe init` (prompts for the server URL).

**Entry point**: `src/index.ts` — parses `process.argv`, routes to command handlers via
`src/cli.ts`, calls `process.exit`.

**Layer split**:

- `src/commands/` — orchestration logic, returns `{ status: 'success' | 'error' }`, never calls
  `process.exit` directly. Accepts injected `cwd` and prompt functions for testability. Exit codes
  are not this layer's concern — mapping `status` to a process exit code happens in `src/cli.ts`.
- `src/lib/getRemoteUrl.ts` — reads the `origin` remote via `git remote get-url origin`.
- `src/lib/registerProject.ts` — raw HTTP call to `POST /api/projects` (no dependency, uses
  `node:http`/`node:https` directly). Returns typed result objects.
- `src/lib/writeSettings.ts`/`src/lib/readSettings.ts` — read/write `.ripe/settings.json`
  (`{serverUrl}`, interactively set).
- `src/lib/writeCache.ts` — writes `.ripe/cache.json` (`{projectId}`, server-resolved).

**`ripe init` flow**: reads the `origin` remote (prompting for an HTTPS equivalent if it isn't
`https://` already) → resolves `serverUrl` (reuses `.ripe/settings.json`'s value if the user
confirms keeping it, otherwise prompts) → POSTs `{ name, remoteUrl }` to
`<server-url>/api/projects` (idempotent find-or-create, no `409`) → writes `.ripe/settings.json`
and `.ripe/cache.json`.

**Testing**: Vitest + `nock` for HTTP interception. Tests create a real `tmpdir` and a real git
repo, and inject prompt functions to avoid stdin. Network is disabled per-test via
`nock.disableNetConnect()`.

**Build output**: `dist/` (ESM, `"type": "module"`). Published to GitHub Packages registry as
`@paulelian-tabarant/ripe`.

See [`cli/STANDARDS.md`](STANDARDS.md) for style and testing conventions specific to this package.
