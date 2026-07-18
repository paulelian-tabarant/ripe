# 🍇 Ripe

**Visibility into which custom skills are actually being used by your coding agent teams.**

## The Problem

Teams create custom skills for their coding agents but have no way to know:

- Which skills are actually being invoked
- Which team members leverage skills effectively  
- Whether a skill is worth maintaining or should be deprecated

## The Solution

This project tracks skill invocation events across teams, providing:

- **Invocation metrics**: which skills are used, how often, and by whom
- **Usage rankings**: identify most and least-used skills over time
- **Deprecation signals**: detect unused skills that may need attention

Focus is on custom `.claude/skills/` defined within projects — the skills teams maintain themselves
— not third-party plugins.

## Getting Started

```bash
git clone <repo-url>
cd ripe
pnpm install
```

### Runtime & Package Manager Versions

Node and pnpm versions are pinned in `package.json`, but different parts of the SDLC read
different fields:

- **Node**: declared in both `devEngines` and `engines`. Locally and in CI, `actions/setup-node`
  reads `devEngines` first, falling back to `engines` only if it's absent. At deploy time,
  Railway's Railpack builder reads `engines.node` directly and doesn't know about `devEngines`.
- **pnpm**: pinned via `packageManager`, read by Corepack (`corepack prepare --activate` in CI's
  setup step).

Both Node fields are kept in sync so every stage resolves the same version.

**Using [mise](https://mise.jdx.dev) locally**: mise doesn't pick up `devEngines` or
`packageManager` automatically — each needs explicit configuration:

- Node: enable idiomatic version files — see mise's
  [Node docs](https://mise.jdx.dev/lang/node.html).
- pnpm: enable mise's experimental hooks and trigger Corepack on install — see mise's
  [Node.js cookbook](https://mise.jdx.dev/mise-cookbook/nodejs.html).

### API (`api/`)

```bash
cp api/.env.local.example api/.env.local   # edit DATABASE_PATH/PORT if needed
pnpm --filter api start:local   # dev server, http://localhost:<PORT>
pnpm --filter api test
```

### Web (`web/`)

```bash
pnpm --filter web dev   # vite dev server, proxies /api to http://localhost:3000
pnpm --filter web test
```

### CLI (`cli/`)

```bash
pnpm --filter ./cli build
node cli/dist/index.js <command-name>   # e.g. `init`
pnpm --filter ./cli test
```

The instructions below cover testing the `init` command against a locally running API. To test
it, pass `http://localhost:<PORT>` when prompted for the server URL, using the `PORT` value from
`api/.env.local`. The API must already be running (`pnpm --filter api start:local`), and
`cli/.ripe/config.json` must not already exist — delete it first (`rm cli/.ripe/config.json`) to
re-run `init` from a clean state.
