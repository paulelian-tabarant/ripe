# ADR-017: Unique Project Names with User Confirmation

**Status**: Accepted  
**Date**: 2026-06-23  
**Deciders**: Paul-Elian Tabarant

## Context

When a user runs `ripe init <server-url>`, the CLI reads the project name from the current
directory and registers it with the server via `POST /api/projects`. Two decisions need to be made:

1. Should the server allow multiple projects with the same name?
2. What should happen when a user tries to register a duplicate name?

The original US-1.1 spec proposed an idempotent server: same name creates a new `project_id` each
time. However, this makes project management complicated — no way to distinguish between projects
with identical names, and accidental re-runs create orphaned project IDs.

## Decision

**Server behavior:**

- Enforce a `UNIQUE` constraint on the `name` column in the `projects` table
- `POST /api/projects` with a duplicate name returns **409 Conflict** with the existing `projectId`
  in the response body:

  ```json
  { 
    "projectId": "proj_abc123",
    "message": "Project already exists"
  }
  ```

**CLI behavior on 409:**

- Prompt the user: `Project '<name>' already exists. Do you want to use it? (y/n)`
- On `y`: write the returned `projectId` to `.ripe/config.json`, display "Using existing project
  ID", exit 0
- On `n`: exit 0 without writing config (user can change directory name or contact server admin)

## Rationale

**Why enforce unique names:**

- Simplifies project management — users can identify projects by name in the dashboard
- Prevents accidental duplicate registrations from fragmenting telemetry data
- Aligns with user expectation: "I already registered this project once"

**Why prompt instead of auto-using existing project:**

- User may have accidentally typed the wrong directory name (e.g., working in a fork or different
  workspace)
- Explicit confirmation prevents silently attaching to the wrong project
- User can abort and fix the name before committing `.ripe/config.json`

**Why return `projectId` in the 409 response:**

- Allows CLI to complete registration without a second HTTP request
- Server already looked up the project to detect the conflict — returning the ID avoids redundant
  work
- Enables the "use existing" flow in a single round-trip

## Alternatives Considered

- **A. Allow duplicate names (idempotent creates)** — creates N projects for the same repo across
  developers; no way to distinguish them in the dashboard; telemetry fragments; ruled out.
- **B. Reject duplicates with no projectId** — CLI must tell user "name taken, pick another";
  forces user to rename directory or contact admin; poor UX; ruled out.
- **C. Auto-use existing project (no prompt)** — silently attaches to existing project even if user
  made a mistake (wrong directory, wrong server); dangerous for accidental data merging; ruled out.

## Consequences

**Positive**:

- ✅ Project names are unique and recognizable in the dashboard
- ✅ Prevents accidental duplicate registrations
- ✅ User confirmation prevents silent misattachment
- ✅ Single HTTP round-trip for the "use existing" flow (409 includes `projectId`)

**Risks/Trade-offs**:

- ⚠️ If two teams want to track the same repo independently, they must use different names
  (acceptable — they can append `-team-a`, `-team-b` to the directory)
- ⚠️ Interactive prompt may fail in non-TTY environments (e.g., CI) — acceptable for MVP; future:
  add `--yes` flag for auto-confirm
- ⚠️ If server admin renames a project server-side, clients would see "already exists" on next
  init (acceptable — rare; client can update local config manually)
