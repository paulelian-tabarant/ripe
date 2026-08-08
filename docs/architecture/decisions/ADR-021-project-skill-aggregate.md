# ADR-021: Project Aggregate Owns Skill Entities

**Status**: Accepted
**Date**: 2026-08-05
**Deciders**: Paul-Elian Tabarant

## Context

[US-2.1](../../spec/user-stories/2026-06-21-us-2.1-skill-registration.md) introduces skill
registration: `(project_id, name)` uniquely identifies a skill, and re-registering an already-known
name must return the same `skill_id` rather than creating a duplicate.

The initial implementation plan mirrored the existing `Project`/`ProjectRepository` shape: a
standalone `Skill` entity with its own `SkillRepository`, referencing `project_id` as a plain
foreign key, with the dedup-on-name invariant enforced via a `UNIQUE(project_id, name)` SQL
constraint plus `ON CONFLICT DO NOTHING`.

That plan was reconsidered before implementation for three reasons:

1. **The invariant isn't expressed in the domain model.** "No two skills with the same name in a
   project" is a real business rule, but with the constraint living only in SQL, nothing in
   `Project.ts` or `Skill.ts` reflects it — a reader of the domain layer wouldn't know the rule
   exists. Relying on a database constraint as the sole enforcement of a domain invariant is an
   anemic-domain-model smell for a rule that has nothing to do with storage mechanics.
2. **Lifecycle coupling.** A project's skills have no reason to outlive their project — they are
   meaningless without it. This is a standard signal that `Skill` is a child entity of the `Project`
   aggregate, not a peer aggregate that merely references it.
3. **Bounded collection size.** Skill catalogs are small (on the order of a dozen per project per
   [US-2.1](../../spec/user-stories/2026-06-21-us-2.1-skill-registration.md)'s scope), so loading a
   project's full skill collection to enforce the invariant in memory is cheap — the usual objection
   to nesting a child collection into an aggregate (unbounded collection size making full-aggregate
   loads expensive) doesn't apply here.

## Decision

`Project` is the aggregate root for `Skill`. `Project` holds its loaded `skills: readonly Skill[]`
and exposes a `registerSkills(names: string[])` domain method that reconciles the requested names
against the already-loaded collection — reusing a `Skill` for a name that already exists, creating
one via `Skill.create` for a name that doesn't — and rejects duplicate names within the request.
Persistence only writes the newly-created `Skill`s; the `UNIQUE(project_id, name)` SQL constraint
remains as a defensive backstop, not the primary enforcement mechanism.

This is the first aggregate-with-child-entities shape in this codebase (every prior entity —
`Project` until now — has been flat). `api/STANDARDS.md` records the general rule this instance
follows, so the next case doesn't have to rediscover it.

Read-side queries (e.g. `GET /projects`, via `ListProjects`) are unaffected: they already return a
dedicated `ProjectReadModel` built directly from a repository query, never by hydrating the
`Project` aggregate. That separation predates this decision and continues unchanged — aggregates
govern write-side consistency; list/read endpoints get their own purpose-built projection.

## Rationale

- **Domain invariants belong in the domain layer.** Modeling "no duplicate skill names per project"
  as aggregate behavior makes the rule visible and testable independent of the database, with the
  SQL constraint demoted to a safety net for the single-process, synchronous-`better-sqlite3`
  environment this system already relies on elsewhere (see the API contract's own note on
  `RegisterProject`-style non-issues around concurrent identical-name registrations).
- **Aggregate boundaries follow lifecycle, not just reference shape.** A `Skill` cannot exist
  meaningfully without its `Project`; modeling that as a plain foreign key would let the code
  construct or reason about orphaned skills the domain never actually allows.
- **Cost is proportional to what's actually loaded.** Because catalogs are small and bounded, the
  usual efficiency argument against nesting a child collection (loading everything just to check
  membership) doesn't hold here — a scoped batch query would save effectively nothing.

## Alternatives Considered

- **`Skill` as a peer aggregate with its own repository** (the original plan, mirroring
  `Project`/`ProjectRepository`) — rejected: leaves the uniqueness invariant expressed only in SQL,
  and doesn't reflect that skills have no independent lifecycle from their project.
- **Enforce the invariant via a scoped repository query** (`SELECT name FROM skills WHERE
  project_id=? AND name IN (...)`, diffing outside the domain layer) — rejected for the same
  domain-layer-visibility reason above; also loses any benefit once collections are small enough
  that loading the full set costs nothing over a scoped query.

## Consequences

**Positive**:

- ✅ The "no duplicate skill names per project" rule is visible and testable directly on `Project`,
  independent of the database
- ✅ Skill lifecycle is structurally tied to its project — no code path can construct or reference a
  skill detached from a project
- ✅ Establishes a documented pattern (`api/STANDARDS.md`) for the next aggregate-with-child-entities
  case, instead of re-deriving it

**Risks/Trade-offs**:

- ⚠️ Registering skills now requires loading the project's full existing skill collection first,
  where the original plan needed only an existence check — acceptable given catalogs are small and
  bounded, but would need revisiting if that assumption ever changes
- ⚠️ This is a new structural pattern for the codebase; the next contributor needs
  `api/STANDARDS.md`'s guidance to apply it consistently rather than defaulting back to the flat,
  peer-repository shape used everywhere else today
