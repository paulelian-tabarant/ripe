# ADR-011: Frontend Architecture

**Status**: Accepted  
**Date**: 2026-06-18  
**Deciders**: Single developer MVP

## Context

The frontend is a single-page React application. We need a clear component structure that supports isolated
testing, reusability, and future expansion.

## Decision

Pages / components (atomic design) / hooks / services layered structure.

## Atomic Design Rationale

- **Atoms**: smallest reusable units (DateInput, LoadingSpinner)
- **Molecules**: combine atoms with local layout logic (FiltersPanel = two DateInputs + labels)
- **Organisms**: combine molecules into complete UI sections (ActivityDashboard = FiltersPanel +
  SkillsTable + loading/error states)
- **Pages**: wire hooks to organisms, own constants like `PROJECT_ID`

## Consequences

**Positive**:

- ✅ HTTP logic isolated from rendering — swappable independently
- ✅ Components testable in isolation without network (no mocking HTTP client)
- ✅ Clear extension points: new pages, new organisms, without touching existing ones
- ✅ Atomic design scales well as app grows

**Risks/Trade-offs**:

- ⚠️ Atomic design may feel over-engineered for single-page MVP
- ⚠️ Molecules add indirection (but natural evolution from atoms)

**Testing strategy**:

- **Components**: integration tests with services and hooks via Testing Library (jsdom, no HTTP mocking) and MSW
- **E2E**: Playwright tests with real server and browser
