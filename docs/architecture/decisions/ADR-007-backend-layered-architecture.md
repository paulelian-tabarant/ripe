# ADR-010: Backend Layered Architecture

**Status**: Accepted  
**Date**: 2026-06-18 (updated 2026-06-21)  
**Deciders**: Single developer MVP

## Context

The backend needs a code structure that balances clarity, testability, and extensibility. The temptation is
to use domain-centric patterns (hexagonal/clean architecture), but we need to assess whether the complexity
is justified.

## Decision

Three-layer server structure — routes, services, repositories. No domain-centric architecture (hexagonal,
clean arch).

## Rationale

**Why not domain-centric (hexagonal/clean architecture)**:

Domain-centric patterns earn their complexity when:

- Business logic is rich enough to test in isolation from infrastructure
- Infrastructure needs to be swappable (multiple databases, APIs, etc.)

This project has neither:

- The "domain" is: receive an invocation event, deduplicate it, count it
- No aggregates, no invariants, no policies
- SQLite is the only database and will remain so for MVP

Adding ports and adapters would be **accidental complexity** for ~20 lines of actual logic.

**Why the service layer exists despite being thin now**:

- It is the right seam for future logic ("ignore events from bots", "cap invocations per session")
- Routes stay thin regardless of how logic grows
- If domain-centric isolation becomes warranted later, it is extracted from the service layer — the
  boundary is already there

## Testing Implication

Tests are end-to-end within the server:

```text
fastify.inject() → routes → services → repositories → in-memory SQLite
```

No mocking of internal layers. Each test covers a complete behavior.

## Alternatives Considered

- **A. Hexagonal/Clean Architecture** — adds complexity for hypothetical extensibility, overkill for
  MVP scope
- **B. Domain-Driven Design** — requires rich domain model (not present here)
- **C. Simple three-layer (chosen)** — sufficient for MVP, extensible when needed

## Consequences

**Positive**:

- ✅ Clear separation: routes handle HTTP, services orchestrate, repositories handle SQL
- ✅ Routes stay thin (pure I/O concerns) regardless of how logic grows
- ✅ Easy to test end-to-end via `fastify.inject()` (no real HTTP server, no mocking)
- ✅ Low cognitive overhead for single developer

**Risks/Trade-offs**:

- ⚠️ Services layer is currently thin (may feel unnecessary)
- ⚠️ If database changes (unlikely in MVP), refactoring would be needed
- ⚠️ Not as testable-in-isolation as hexagonal (but E2E tests are faster anyway)

**Upgrade path if needed**:

- If logic becomes complex, extract ports/adapters from the service layer
- Tests move from E2E to unit + E2E hybrid
- No breaking changes to the HTTP API
