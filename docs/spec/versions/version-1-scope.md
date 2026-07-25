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

Switching between local, staging, and production requires manually reconfiguring the client's server
URL (exact mechanism TBD). Project identity is derived from the git remote and resolved fresh on
each server call (see [ADR-018](../../architecture/decisions/ADR-018-remote-derived-project-identity.md)) —
it is not cached locally, so it remains valid across environments regardless of which server URL
is configured. No automated promotion pipeline for v1.

**Before broader rollout**: automate environment switching and document staging data retention policy.

---
