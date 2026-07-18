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

Requires Node 24.18.0 and pnpm 11.8.0 (see `packageManager` in `package.json`).

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
pnpm --filter ./cli init   # runs the built CLI's `init` command
pnpm --filter ./cli test
```
