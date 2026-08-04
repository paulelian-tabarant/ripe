# ADR-020: Event Schema Extensibility Boundary

**Status**: Accepted  
**Date**: 2026-08-04  
**Deciders**: Single developer MVP

## Context

[US-2.2](../../spec/user-stories/2026-06-21-us-2.2-event-submission.md) defines `POST
/api/events` with an envelope (`eventType`, `timestamp`, `userEmail`, `userName`, `projectId`,
`sessionId`, `clientType`) common to all events, and a `payload` shape specific to `eventType`.
The only kind shipped in v1 is `skill_invocation`, deduplicated by `(project_id, session_id,
tool_use_id)`.

Before more event kinds get planned, it's worth being explicit about which future additions this
shape is meant to absorb, since not everything telemetry-adjacent has the same domain shape.

## Decision

The envelope/`payload` split extends cleanly to other **invocation-shaped** event kinds — e.g. an
MCP tool invocation, a rule invocation. These share every envelope field and the same dedup grain:
one event per `(project_id, session_id, tool_use_id)`. Adding one is: new `eventType`, new
`payload` shape, no envelope change.

It does **not** extend to telemetry that doesn't share that grain or that actor:

- **Tokens consumed** — likely a different grain (per-session or per-turn, not necessarily
  per-invocation). If attributable to a specific invocation, it's a `payload` field on that
  event, not a new event kind. If not, it needs its own key, not `tool_use_id`.
- **User feedback** — a different actor and trigger entirely: submitted by a human from the
  dashboard, not parsed by `ripe sync` from a transcript. It also needs an identified user, which
  this system deliberately doesn't have (no auth, no users table — per US-2.2's scope).

When the `events` table is implemented, the `(project_id, session_id, tool_use_id)` uniqueness
constraint should be scoped to invocation-shaped event types, not applied table-wide by default —
a future non-invocation event kind won't have a meaningful `tool_use_id` to key on.

## Rationale

- ✅ Keeps the envelope's "future event kinds" promise honest — it's scoped to one domain shape,
  not a catch-all
- ✅ Avoids forcing mismatched grains (per-invocation vs. per-session vs. per-user-action) into one
  table/constraint, which would otherwise show up as nullable columns or special-cased queries
- ✅ Matches [ADR-005](ADR-005-activity-endpoint-design.md)'s read-side extensibility (`skills`,
  `tools`, `rules` as sibling keys) with a corresponding boundary on the write side

## Alternatives Considered

- **One `events` table/endpoint for everything telemetry-related** — simplest on paper, but mixes
  incompatible grains and actors into one constraint and one schema, pushing the complexity into
  every consumer instead of the write path
- **A new endpoint per event kind from day one** — avoids the mixing problem but forecloses the
  cheap extensibility invocation-shaped events actually get from sharing the envelope

## Consequences

**Positive**:

- ✅ Clear rule for future contributors: "is this invocation-shaped?" decides whether it's a new
  `eventType` on the existing endpoint or a new resource entirely
- ✅ Dedup constraint stays meaningful as new event kinds are added

**Risks/Trade-offs**:

- ⚠️ Tokens-consumed and user-feedback remain unscoped — this ADR only draws the boundary, it
  doesn't design either feature
