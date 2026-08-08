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

**Layer split** (see [`cli/STANDARDS.md`](STANDARDS.md) for the injection pattern and invariants
behind this):

- `src/index.ts` — composition root: parses `process.argv`, builds the real I/O primitives, calls
  `process.exit`.
- `src/cli.ts` — routes to commands.
- `src/commands/init.ts` — orchestration logic only; depends on injected `prompter`/`presenter`
  plus the `ProjectDirectory`/`GitRepository`/`SettingsStore`/`CacheStore` dependencies below.
- `src/commands/init.factory.ts` — composition root for the `init` command: builds the real
  `InitPrompter`/`InitPresenter` (via `init.prompter.ts`/`init.presenter.ts`) and the real
  `ProjectDirectory`/`GitRepository`/`SettingsStore`/`CacheStore` instances.
- `src/lib/project-directory.ts` — wraps the process's cwd (`getPath()`/`getName()`).
- `src/lib/git-repository.ts` — reads the `origin` remote via `git remote get-url origin` and
  checks whether it's HTTPS.
- `src/lib/api-client.ts` — `ApiClient` interface (`registerProject`), backed by a raw `fetch` call to
  `POST /api/projects`. Returns typed result objects.
- `src/lib/settings-store.ts` — reads/writes `.ripe/settings.json` (`{serverUrl}`, interactively
  set).
- `src/lib/cache-store.ts` — writes `.ripe/cache.json` (`{projectId}`, server-resolved).

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
