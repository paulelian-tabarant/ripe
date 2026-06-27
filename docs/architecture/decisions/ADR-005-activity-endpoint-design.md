# ADR-007: Activity Endpoint Design

**Status**: Accepted  
**Date**: 2026-06-18  
**Deciders**: Single developer MVP

## Context

The API needs an endpoint for the frontend to fetch usage data. Key considerations:

- Single MVP feature (skill invocation counts over a date range)
- Future extensibility (other types like MCP tools, context rules may be tracked later)
- Performance and simplicity

## Decision

A single `GET /api/projects/{project_id}/activity?from_date=&to_date=` endpoint returns all usage data
for a project, grouped by type:

```json
{
  "skills": [
    {
      "skill_id": str,
      "name": str,
      "invocations": int
    }
  ]
}
```

Skill names are resolved server-side via a JOIN with the `skills` table. Results are sorted by
`invocations` descending.

## Rationale

**URL structure**:

- ✅ Scoped to `project_id` — each project's data is isolated by design
- ✅ Clearly identifies the resource (activity data for a project)

**Grouped response**:

```json
{
  "skills": [...],
  "tools": [...],    // future
  "rules": [...]     // future
}
```

- ✅ Adding a new type (e.g. MCP tool uses) only requires a new key
- ✅ Existing frontend code reading `response.skills` is unaffected (forward-compatible)
- ✅ Single endpoint covers current and future needs

**Server-side name resolution**:

- ✅ Server JOINs `skills` and `events` anyway to compute counts
- ✅ Including `name` costs nothing and avoids client-side mapping logic
- ✅ No second round-trip needed

## Alternatives Considered

- **A. `GET /api/skills`** — misleading (returns usage counts, not skill definitions); flat list
  incompatible with future types
- **B. `GET /api/projects/{id}/skill-uses`** — accurate but too narrow; adding developer breakdown later
  would need a new endpoint
- **C. `GET /api/projects/{id}/activity`** ← **Chosen** — reads naturally, extends naturally, single
  endpoint

## Consequences

**Positive**:

- ✅ One endpoint covers all current and future usage types
- ✅ URL scoped to `project_id` — project data is isolated by design
- ✅ Consumers are forward-compatible (unknown keys ignored)
- ✅ No client-side resolution logic needed
- ✅ Server benefits from existing JOINs (no extra queries)

**Risks/Trade-offs**:

- ⚠️ Currently returns only one type (skills) — may feel over-engineered for MVP
- ⚠️ Client must know to access `response.skills` (minor documentation burden)
