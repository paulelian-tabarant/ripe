# Version 2.0.0 : Scope — Richer Dashboard Visualizations

**Status**: Defined  
**Date**: 2026-06-22

---

## Overview

V2 extends the dashboard with visualizations that reveal *when* skills are used, not just *how often*.
The ranked table from V1 answers "which skills are popular"; V2 adds temporal context to that picture.

---

## Feature: Skill Usage Heatmap

A heatmap complements the existing ranked table on the dashboard page. Both views share the same
date range filter and update together.

The heatmap is a grid: rows are skills, columns are calendar weeks within the selected date range.
Each cell is colored on a blue-to-red scale proportional to the invocation count for that skill
that week — blue for low activity, red for high. Skills are ordered top-to-bottom by total
invocations over the selected range, matching the ranked table's order so the two views stay coherent.

Hovering a cell surfaces the skill name, the week range, and the invocation count for that week.

**Testing note**: the heatmap requires multi-week data to be exercised meaningfully. Seeded fixture
data spanning several weeks is required in the test environment.

---

---

## Feature: Skill Rename Detection

Detect when a skill file is renamed (not deleted+added) and preserve historical telemetry data
under the new name.

**Detection technique**: use git's own rename detection instead of diffing local cache state.

- Client persists `last_synced_sha` locally (gitignored, not `.ripe/skills.json` — that cache is
  a call-skipping optimization only, not a historical record)
- On `ripe sync`: `git diff -M --name-status <last_synced_sha> HEAD -- .claude/skills/` — git
  reports renames (`R100 old/path new/path`), adds, and deletes in one call, using its own
  content-similarity heuristic (same one behind `git log --follow`)
- Renames reported by git → look up the old name's `skill_id` (from cache or a fresh server
  lookup) → `PUT /api/skills/:skill_id { name: new_name }`, preserving history under the same ID
- Adds reported by git with no matching rename → register as new skills (existing `POST` flow)
- No historical name list needs to be stored separately — `git ls-tree -r --name-only
  <last_synced_sha> -- .claude/skills/` reconstructs the old skill directory on demand, straight
  from git's object store
- Update `last_synced_sha` to current `HEAD` after a successful sync
- Ambiguous cases (content rewritten enough that git doesn't detect a rename) fall back to
  delete+add, same as V1 behavior

**Why**: In V1, renaming a skill orphans all historical data (treated as delete + add with new ID).
This makes refactoring skill names costly for teams with long telemetry history.

**Testing note**: verify renamed skill retains historical counts in dashboard, and new events use updated name.

---

## Feature: Standalone Deployable Distribution

Make the server and dashboard self-hostable — users can deploy Ripe to their own infrastructure
instead of relying on the hosted version.

**Changes**:

- **Docker image**: single image containing the server + compiled frontend assets, exposed on a configurable port
- **Build once, deploy everywhere**: image built once in CI (on merge to `main`), then promoted to staging
  and production — no rebuild per environment
- **Environment-based configuration**: database path, port, CORS origins configurable via env vars
  (no hardcoded Railway URLs)
- **Documentation**: deployment guide covering Docker run, docker-compose, and common PaaS platforms (Fly.io, Railway, Render)

**Why**: lowers barrier to adoption for teams with data residency requirements, on-prem mandates, or who prefer self-hosting.
The hosted version remains the default/recommended option for most users.

**Testing note**: verify the Docker image boots cleanly, serves the frontend, and handles requests
with a SQLite file mounted as a volume.

---

## Deferred from V1 (still under consideration for V2+)

- Per-developer breakdown: which team members are using which skills
- Skill effectiveness / outcome tracking
- Authentication: shared API key per team (required before broader rollout)

---
