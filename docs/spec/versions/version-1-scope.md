# Version 1.0.0 : Scope — Skill Usage Tracking MVP

**Status**: Defined  
**Date**: 2026-06-18

---

## Overview

Define the boundaries of the MVP for skill usage tracking. What we will and will not track, and why.

---

## Scope Decisions

### MVP: Invocation Tracking Only

**What we're tracking (v1):**

- Skill invocation events: which skill, when, by whom
- Skill usage ranking: most-used skills over a date range

**What we're NOT tracking:**

- Effectiveness/outcome quality (deferred to [v2](version-2-scope.md)+)
- Completion rates (future versions)
- Developer satisfaction ratings (future versions)
- Per-developer breakdown (deferred to [v2](version-2-scope.md)+)

**Reasoning**: Non-usage is a strong signal on its own. If a skill is never invoked, that indicates
it may have poor description, unclear value prop, or actual lack of utility. MVP proves the
instrumentation and dashboard value, then users will tell us if they need outcome tracking.

---

### Project-Local Skills Only

**What we're tracking**: skills defined in `.claude/skills/` within each project — the custom skills
teams write, maintain, and potentially deprecate.

**What we're NOT tracking**: third-party/plugin skills (e.g. `superpowers:brainstorming`, namespaced
with `:`). Those are outside the team's control and outside the product's scope. The client skips
namespaced skills with a stderr warning.

**Rationale**: the product exists to give teams visibility into their own instrumentation — not into
plugin usage they cannot influence. Keeping scope narrow also simplifies the client: one lookup path
(`.claude/skills/`), not two.

---

### Dashboard: Ranked Table Only

The V1 dashboard displays a single ranked table — skills ordered by invocation count over a selected
date range. Charts and visualisations are out of scope for V1. The [v2 scope](version-2-scope.md)
introduces a heatmap showing usage trends over time.

---

### Use Case: Skills (not MCP tools, not context rules)

Skills chosen because:

- Clear invocation boundaries (easy to instrument)
- Discrete, measurable units
- Existing team pain point
- Natural progression to effectiveness tracking later

---

## MVP Technical Constraints

These are known v1 limitations accepted for the initial experiment, not permanent design choices.

### No Authentication

`POST /api/events` requires no authentication for the MVP. The server URL is not advertised;
discovery requires opting in to this project. The data is low-sensitivity (skill invocation counts,
timestamps).

**Before broader rollout**: add a shared API key per team (storage mechanism TBD), sent as
`Authorization: Bearer <api_key>`. GDPR compliance review required before using `user_email`
in a multi-team deployment.

### Manual Environment Switching

Switching between local, staging, and production requires manually reconfiguring the client's
server URL: delete `.ripe/cache.json` and run `ripe init` again (see `cli/README.md`). No env var
override, no automated promotion pipeline for v1. `repo_key` is derived from the git remote and
recomputed fresh on each server call (see
[ADR-018](../../architecture/decisions/ADR-018-remote-derived-project-identity.md)) — it is never
cached, so it resolves consistently regardless of server URL. `project_id` *is* cached locally as
a call-skipping optimization, which is exactly why re-pointing to a new server requires clearing
the cache first — a stale `project_id` from the old server won't resolve against the new one.

**Before broader rollout**: automate environment switching and document staging data retention policy.

---

### Ongoing: Transcript Format Recheck

`ripe sync` Phase 2 parses Claude Code's `.jsonl` transcript format
([ADR-001](../../architecture/decisions/ADR-001-sessionend-hook-transcript-parsing.md)). Stability
was assessed once, across 31 patch versions (see
[transcript-format-stability.md](../../architecture/analysis/transcript-format-stability.md)), not
verified continuously.

**v1 commitment**: recheck the transcript structure against the latest installed Claude Code CLI
version whenever it bumps a minor/major version (e.g. 2.1 → 2.2), or at minimum once per quarter.
Re-run the schema validation tests against a fresh transcript sample; update the parser and the
stability doc if the structure changed.

---
