# ADR-015: Server-Managed Skill IDs

**Status**: Accepted — supersedes [ADR-005](ADR-005-stable-skill-ids.md)  
**Date**: 2026-06-21  
**Deciders**: Single developer MVP

## Context

ADR-005 proposed client-generated UUIDs stored in skill frontmatter for stable identification across
renames. A subsequent design decision moved skill registration to the SessionEnd hook, making
client-side UUID management unnecessary.

The core need is rename-stability within a project: if a skill is renamed, historical events should
still count toward the same skill in the dashboard.

## Decision

Skill IDs are assigned by the server on first registration. **The server is the single source of truth
for skill identities.** The client maintains a local cache of `(skill_name → skill_id)` mappings for
use during event submission. This cache is gitignored — not versioned with the code.

**Registration** (Phase 1 of SessionEnd hook):

1. Client reads `.claude/skills/` and collects skill names
2. For skills absent from the local cache, client calls `POST /api/skills`
3. Server assigns stable IDs and returns them
4. Client writes the returned IDs to the local cache (format TBD, gitignored)

**Event submission** (Phase 2 of SessionEnd hook):

- Client sends `skill_id` from the local cache — never derived from skill files directly

## Rationale

- ✅ Server owns skill identity — no risk of conflicting IDs generated on different machines
- ✅ Zero developer action — new skills are registered automatically on first use
- ✅ Local cache is recoverable — if lost, re-registration on the next session recreates it
- ✅ Skills are project-scoped: `(project_id, skill_name)` uniquely identifies a skill server-side

## Alternatives Considered

- **Client UUIDs in frontmatter (ADR-005)** → Requires manual ID assignment; IDs scattered across
  skill files; source of truth is ambiguous (file vs. server)
- **Registration at `init` time** → Requires re-running `init` for every new skill; not self-healing
- **Registration at SessionEnd (chosen)** → Automatic, self-healing, server always authoritative

## Consequences

**Positive**:

- ✅ No developer action required — new skills register on first use
- ✅ Server is the unambiguous source of truth for skill IDs
- ✅ Cache loss is recoverable — next session re-registers any missing skills

**Risks/Trade-offs**:

- ⚠️ Skill sync requires network at SessionEnd (already required for event submission)
- ⚠️ Server must be idempotent on registration: same `(project_id, skill_name)` always returns the
  same ID
- ⚠️ Local cache format is TBD — implementation detail, not architecturally significant
