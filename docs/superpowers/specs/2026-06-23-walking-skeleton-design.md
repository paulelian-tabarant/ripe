# Walking Skeleton & Project Registration Design

**Date**: 2026-06-23  
**User Story**: US-1.1  
**Status**: Approved

## Overview

US-1.1 establishes the foundational infrastructure for the ripe telemetry system. It delivers:

1. A publishable CLI package (`ripe`) for project registration
2. A Fastify server with health check and project registration endpoints
3. Railway deployment pipeline (staging + production)
4. GitHub Actions CI/CD with parallel lint, typecheck, and test jobs
5. SQLite database with projects table

No frontend yet — that comes in Slice 2 (US-1.2).

## Package Structure

```text
ripe/
├── cli/           # CLI package (publishable to npm)
│   ├── src/
│   │   ├── cli.ts           # CLI entrypoint (#!/usr/bin/env node)
│   │   ├── commands/
│   │   │   └── init.ts      # `ripe init` implementation
│   │   └── lib/
│   │       ├── config.ts    # Read/write .ripe/config.json
│   │       └── http.ts      # POST to server
│   ├── package.json         # bin: { "ripe": "./dist/cli.js" }
│   └── tsconfig.json
├── api/           # Fastify backend
│   ├── src/
│   │   ├── index.ts         # Server entrypoint
│   │   ├── routes/
│   │   │   ├── health.ts    # GET /api/health
│   │   │   └── projects.ts  # POST /api/projects
│   │   ├── services/
│   │   │   └── projectService.ts
│   │   ├── repositories/
│   │   │   └── projectRepository.ts
│   │   └── db/
│   │       └── schema.sql   # CREATE TABLE projects
│   ├── Dockerfile           # Multi-stage build for Railway
│   ├── package.json
│   └── tsconfig.json
├── .github/
│   └── workflows/
│       └── ci.yml           # CI/CD pipeline
├── pnpm-workspace.yaml
└── package.json              # Root workspace scripts
```

**Key points:**

- Two packages: `cli/` (published to GitHub Packages as `@paulelian-tabarant/ripe`) and `api/` (backend server, not publishable)
- No `web/` package yet (introduced in US-1.2 for the dashboard)
- `cli/package.json` includes `"name": "@paulelian-tabarant/ripe"` and `"bin": { "ripe": "./dist/cli.js" }` for global install

## Client CLI

### Installation

The CLI is published to GitHub Packages as `@paulelian-tabarant/ripe`.

Developers install globally via npm:

```bash
npm install -g @paulelian-tabarant/ripe
```

During development, use `npm link` from the `cli/` directory.

### Commands

#### `ripe init <server-url>`

Registers the project with the telemetry server.

**Behavior:**

1. Check if `.ripe/config.json` exists
   - If yes: warn "Project already initialized" and exit 0
2. Read project name from `process.cwd()` basename
3. POST `{ name: <project-name> }` to `<server-url>/api/projects`
4. Handle response:
   - **201 Created**: parse `projectId`, write to config, display "Project registered successfully"
   - **409 Conflict**: prompt "Project '`<name>`' already exists. Do you want to use it? (y/n)"
     - On 'y': write returned `projectId` to config, display "Using existing project ID"
     - On 'n': exit 0 without writing config
   - **Network error**: stderr "Server unreachable at `<server-url>`", exit 1
   - **Other error**: stderr "Failed to register project: `<status>` `<body>`", exit 1
5. Exit 0

### Configuration File

**Location**: `.ripe/config.json` (committed to git)

**Structure** (camelCase):

```json
{
  "serverUrl": "https://ripe-staging.railway.app",
  "projectId": "proj_V1StGXR8_Z5jdHi6B"
}
```

**Cache file** (`.ripe/cache.json`, gitignored) reserved for skills mapping in Slice 3.

## Server Implementation

### Architecture

Three-layer structure per ADR-010:

**Routes** → handle HTTP, validate schema, return responses  
**Services** → orchestrate business logic (thin for US-1.1)  
**Repositories** → execute SQL, return data

### API Endpoints

#### `GET /api/health`

Health check endpoint.

**Response:**

```text
200 OK
{ "status": "ok" }
```

#### `POST /api/projects`

Register a new project or return existing project ID.

**Request body:**

```json
{ "name": "ripe" }
```

**Responses:**

**201 Created** (new project):

```json
{ "projectId": "proj_V1StGXR8_Z5jdHi6B" }
```

**409 Conflict** (duplicate name):

```json
{ 
  "projectId": "proj_V1StGXR8_Z5jdHi6B",
  "message": "Project already exists"
}
```

**400 Bad Request** (invalid body):

```json
{ "error": "Invalid request body" }
```

#### `GET /api/projects`

List all registered projects (needed for testing and US-1.2 frontend).

**Response:**

```json
[
  { "projectId": "proj_abc123", "name": "ripe" },
  { "projectId": "proj_def456", "name": "other-project" }
]
```

Results are unordered.

### Database Schema

**File**: `api/src/db/schema.sql`

```sql
CREATE TABLE projects (
  project_id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);
```

**Project ID format**: `proj_` prefix + nanoid (~26 chars total, URL-safe)

### Repositories

**`projectRepository.ts`**:

- `insertProject(name: string): string` — inserts project, returns projectId; throws on unique constraint violation
- `listProjects(): Array<{ projectId: string, name: string }>` — returns all projects

Uses `better-sqlite3` synchronous API with in-memory SQLite for tests, file-based for production.

## Deployment & CI/CD

### Dockerfile

Multi-stage build for Railway deployment using `pnpm deploy`:

**Stage 1 (build):**

- Install all workspace dependencies
- Compile TypeScript to JavaScript for the api package

**Stage 2 (production):**

- Use `pnpm deploy` to create standalone api package with only production dependencies
- Final image contains just the api package (no workspace overhead)
- Run server with `node dist/index.js`

This produces the smallest possible production image - only the api package and its runtime dependencies.

### Railway Configuration

Two services under one Railway project (Hobby plan, $5/month):

| Service                | Purpose                                       | Deploy trigger                    | Database                       |
| ---------------------- | --------------------------------------------- | --------------------------------- | ------------------------------ |
| `ripe-staging` | Integration testing, artificial invocations   | Auto on merge to `main` + manual  | Ephemeral (resets each deploy) |
| `ripe`         | Real daily use                                | Manual only                       | Persistent SQLite volume       |

### GitHub Actions Workflow

**On every push (any branch) — parallel jobs:**

1. **cli-lint**: `pnpm --filter cli lint` (Biome)
2. **cli-typecheck**: `pnpm --filter cli typecheck`
3. **cli-test**: `pnpm --filter cli test`
4. **api-lint**: `pnpm --filter api lint` (Biome)
5. **api-typecheck**: `pnpm --filter api typecheck`
6. **api-test**: `pnpm --filter api test`
7. **lint-md**: `pnpm lint:md` (markdown lint)

All jobs share pnpm cache via `actions/setup-node` with `cache: 'pnpm'`.

**On merge to `main`:**

- Skip checks (already validated via PR)
- Trigger Railway staging deploy directly

**Manual triggers (`workflow_dispatch`):**

- **Deploy to staging from any branch**: wait for all 7 check jobs to pass, then deploy
- **Deploy to production from `main`**: skip checks, deploy directly

### GitHub Branch Protection

Protect `main` branch with:

- Require PR before merging
- Require status checks to pass: `cli-lint`, `cli-typecheck`, `cli-test`, `api-lint`, `api-typecheck`, `api-test`, `lint-md`
- No direct pushes allowed

This ensures all code reaching `main` has passed CI.

## Testing Strategy

Following ADR-012, US-1.1 includes:

### CLI Tests (Vitest + nock)

Mock HTTP with `nock`, test CLI behavior:

- `init` with valid server → writes config with correct `serverUrl` and `projectId`
- `init` when `.ripe/config.json` already exists → warns "Project already initialized", exits 0
- `init` with server unreachable → stderr "Server unreachable at `<url>`", exits 1
- `init` with duplicate project name (409):
  - User responds 'y' → writes existing `projectId` to config, displays "Using existing project ID"
  - User responds 'n' → exits 0 without writing config

### API Tests (Vitest + fastify.inject() + SQLite)

Black-box HTTP tests, no direct repository testing:

- `GET /api/health` → 200 `{ "status": "ok" }`
- `POST /api/projects { name: "foo" }` → 201, response includes `projectId` matching `proj_*` format
- Then `GET /api/projects` → list contains `{ projectId: "proj_...", name: "foo" }`
- `POST /api/projects { name: "foo" }` twice → second call returns 409 with same `projectId` and message
- `POST /api/projects` with invalid body → 400

**Testing strategy:**

- Most tests use **in-memory SQLite** (`:memory:`) for speed and isolation
- One **file-based smoke test** verifies disk I/O works (creates `./test.db`, runs basic CRUD, cleans up)

### E2E Tests

None for US-1.1 (deferred until frontend exists in Slice 2).

## Acceptance Criteria

From US-1.1 spec, updated based on design:

- [ ] `GET /api/health` returns `{ "status": "ok" }`
- [ ] `ripe init <server-url>` creates `.ripe/config.json` with `serverUrl` and `projectId`
- [ ] Project name is derived from current directory name
- [ ] Running `init` when config already exists warns and exits 0
- [ ] Server unreachable → stderr error, exit 1
- [ ] Duplicate project name → 409 with prompt; 'y' writes existing projectId, 'n' exits without writing
- [ ] `GET /api/projects` returns all registered projects with `projectId` and `name`
- [ ] CI runs lint (Biome + markdown), type checks, and tests on every push; failing CI blocks merge
- [ ] Merging to `main` automatically deploys to staging
- [ ] Production deployment requires manual trigger from Railway dashboard (or GitHub Actions manual workflow)
- [ ] Deployed server responds to `GET /api/health` at both staging and production URLs
- [ ] All CLI and API tests pass
- [ ] CLI package published to GitHub Packages as `@paulelian-tabarant/ripe`

## Implementation Notes

### Dependencies

**CLI**:

- Native `fetch` (Node 18+) — HTTP client (no dependencies needed)

**API**:

- `fastify` — HTTP framework
- `better-sqlite3` — SQLite driver
- `nanoid` — project ID generation

**Dev dependencies (shared)**:

- `@biomejs/biome` — linting and formatting
- `vitest` — testing
- `typescript` — type checking
- `tsx` — dev server for TypeScript

**Node version requirement:**

- Node.js >= 18.0.0 (for native fetch support)

### Root Workspace Scripts

`package.json` at root contains only repository-wide scripts (markdown lint, architecture diagrams):

```json
{
  "scripts": {
    "lint:md": "markdownlint-cli2 \"**/*.md\" \"#node_modules\"",
    "fix:md": "markdownlint-cli2 --fix \"**/*.md\" \"#node_modules\""
  }
}
```

Package-specific scripts (`lint`, `typecheck`, `test`) live in each workspace package's own
`package.json` (`cli/`, `api/`). Run them via:

```bash
pnpm --filter cli lint
pnpm --filter cli typecheck
pnpm --filter cli test
pnpm --filter api lint
pnpm --filter api typecheck
pnpm --filter api test
```

### Migration Path

When the dashboard is introduced in US-1.2:

- Add `web/` package to workspace
- API server serves SPA via `@fastify/static` at `/`
- `GET /api/projects` endpoint already exists (built in US-1.1 for testing)
- No database migration needed

## Why This Design

**Monorepo with publishable CLI**: Standard npm pattern; `npm install -g @paulelian-tabarant/ripe`
works via GitHub Packages. Clear separation between publishable (`cli/`) and internal (`api/`)
packages.

**Committed config with separate cache**: Configuration (`serverUrl`, `projectId`) is shared across
team members via git. Cache (skills mapping in Slice 3) is developer-local.

**Unique project names with 409 prompt**: Prevents accidental duplicate registrations while
allowing teams to share project IDs. User-friendly CLI flow.

**Three-layer backend**: Follows ADR-010. Routes stay thin, repositories handle SQL, services are
the seam for future logic (e.g., "ignore bot invocations"). E2E tests via `fastify.inject()` cover
the full stack without mocking internal layers.

**Parallel CI jobs**: Lint, typecheck, and test run concurrently for fast feedback. Checks only run
once (on push to PR branch), not again on merge to `main`.

**Staging auto-deploy, production manual**: Safe by default. Staging validates deployments before
production promotion. Manual production trigger prevents accidental releases.

**Biome over ESLint + Prettier**: Faster, simpler config, all-in-one tool. Single `biome.json` replaces `.eslintrc` + `.prettierrc`.

**Project ID format (`proj_` + nanoid)**: URL-safe, short, recognizable prefix. Better than raw
UUIDs (shorter, clearer in logs).
