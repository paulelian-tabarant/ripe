# ADR-009: Architecture Documentation with LikeC4

**Status**: Accepted  
**Date**: 2026-06-18  
**Deciders**: Single developer MVP

## Context

We need to document the system architecture in a clear, reviewable way. Options range from informal diagrams
to dedicated architecture tools. Key requirements:

- Diagrams should be code (reviewable in PRs, versionable)
- C4 model provides appropriate abstraction levels
- Low tooling overhead (should not block implementation)

## Decision

Architecture diagrams (C4 Level 1 and Level 2) are maintained as code in `docs/architecture/architecture.c4`
using [LikeC4](https://likec4.dev).

**Scope for MVP**:

- Level 1 (Context) — documented now
- Level 2 (Container) — documented now
- Level 3 (Component) — to be written after the first implementation iteration
- Level 4 (Code) — skipped (overkill for this scale)

## Rationale

**LikeC4 (chosen)**:

- ✅ Purpose-built C4 DSL with high-quality diagram rendering
- ✅ Interactive HTML export (not just static images)
- ✅ Node.js is already present (React + Vite frontend), no new ecosystem
- ✅ VS Code extension for live preview (zero setup)
- ✅ Diagrams-as-code are reviewable in PRs like any other source file

**Why LikeC4 over alternatives**:

- **Mermaid** — zero extra tooling, renders in GitHub, but limited C4 support and diagrams embedded
  in prose
- **Structurizr** — dedicated C4 tool but Java-based and heavier to set up
- **draw.io** — GUI-based, no code representation, harder to review in PRs
- **Markdown + ASCII** — too low-fidelity for system architecture

## Consequences

**Positive**:

- ✅ Diagrams stay in sync with the codebase via PR reviews
- ✅ No extra runtime dependency — rendered on demand via `npx`
- ✅ Single source of truth for both Context and Container views
- ✅ Interactive exploration (zoom, pan in HTML export)
- ✅ Version-controlled, mergeable architecture history

**Risks/Trade-offs**:

- ⚠️ One more tool to learn (but DSL is simple, well-documented)
- ⚠️ Level 3 (Component) requires domain knowledge after first iteration (acceptable, planned
  explicitly)
- ⚠️ Depends on Node.js ecosystem (but already present for React build)

**Deferred to post-MVP**:

- Component diagrams (Level 3) — add after implementation to avoid over-documenting
- Live view in CI/CD (e.g., embedded in PR descriptions) — nice-to-have, not critical
