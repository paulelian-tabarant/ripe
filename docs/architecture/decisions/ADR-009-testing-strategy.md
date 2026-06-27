# ADR-012: Testing Strategy

**Status**: Accepted  
**Date**: 2026-06-18 (updated 2026-06-21)  
**Deciders**: Single developer MVP

## Context

We need a testing strategy that covers the entire system — from client script to server to
frontend — while remaining practical for a single developer.

## Decision

Four layers of testing:

| Layer               | Tool                                           | Scope                                                                                       |
|---------------------|------------------------------------------------|---------------------------------------------------------------------------------------------|
| Client integration  | Vitest + `nock`                                | fixture `.jsonl` → parse → skill lookup → assert POST payload                               |
| Server integration  | Vitest + `fastify.inject()` + in-memory SQLite | POST events → GET activity → assert output (one test per behavior)                          |
| Frontend components | Vitest + Testing Library (jsdom)               | isolated component behavior, edge cases                                                     |
| Full e2e            | Playwright                                     | fixture transcript → telemetry client subprocess → local server → browser asserts dashboard |

## Client Integration Tests (Vitest + nock)

Test the client script in isolation with mocked HTTP.

**Behaviors covered**:

- Transcript with Skill invocations → correct batch POST payload
- Transcript with multiple invocations → all included in one POST
- Transcript with no Skill tool uses → no request made, exit 0
- Namespaced skill → skipped, warning on stderr, rest of batch still sent
- Non-Skill tool uses → ignored
- Missing or invalid server URL config → silent exit 0
- Missing local project cache (init not run) → stderr warning, exit 0
- Server unreachable → stderr warning, exit 0
- Unknown transcript version → warning logged with version string, continues parsing
- `init` command — server registers project and returns `project_id` → cached locally
- `init` command — server unreachable → stderr error, exit 1

## Server Integration Tests (Vitest + fastify.inject() + in-memory SQLite)

Test the Fastify server end-to-end using `fastify.inject()` with an in-memory SQLite database
(no disk, no real HTTP, fast).

**Behaviors covered**:

- POST events → GET activity returns correct invocation counts
- Duplicate events → deduplicated (count = 1)
- Skill rename → current_name updated, count continuous
- Date range filter → only matching events counted
- Project scoping → events from other projects not included
- Empty project → empty skills list

## Frontend Component Tests (Vitest + Testing Library)

Unit tests for React components using jsdom (no real browser).

**What to test**:

- `DateInput` renders and emits correct onChange shape
- `FiltersPanel` wires date inputs together
- `SkillsTable` renders data correctly
- `LoadingSpinner` shows when loading=true
- Error states display appropriate messages

**What NOT to test**:

- HTTP calls (mocked at service layer)
- Browser APIs beyond what jsdom provides
- Navigation (single-page app, tested in E2E)

## Full E2E Test (Playwright)

End-to-end journey test using a real browser.

**Setup**:

- Hand-crafted `.jsonl` fixture (verified against actual Claude Code transcripts in
  `~/.claude/projects/`)
- Runs the telemetry client script as a subprocess against a locally running server
- Opens a real browser and asserts the dashboard renders

**Journey**:

1. Start local server with fixture data
2. Run the telemetry client script to ingest events
3. Open browser, navigate to dashboard
4. Assert expected skills appear in the table
5. Change date range
6. Assert table updates

**Why NOT Vitest browser mode**: Playwright is better suited for browser-level journeys. Regular jsdom-based
tests are sufficient for component unit tests (no real browser needed).

**Navigation coverage**: For MVP there is one page, so no navigation to test. When routes are
added, each critical user journey test naturally traverses relevant navigation. Routes not covered
by any journey get a minimal Playwright test that lands on them and confirms they render.

## Test Structure and Tools

**Client** (`client/`):

```bash
npm run test  # Vitest
```

**Server** (`server/`):

```bash
npm run test  # Vitest
# Includes:
#   tests/routes/events.test.ts
#   tests/routes/activity.test.ts
#   tests/services/telemetryService.test.ts
```

**Frontend** (`web/`):

```bash
npm run test  # Vitest
```

**E2E**:

```bash
npm run test:e2e  # Playwright (from project root)
```

## Consequences

**Positive**:

- ✅ Each layer testable independently (clear boundaries)
- ✅ E2E tests provide confidence in full flow
- ✅ Fast feedback (in-memory SQLite, `fastify.inject()`, jsdom — no real browser or HTTP for unit
  tests)
- ✅ Comprehensive coverage without excessive mocking
- ✅ Unified test runner (Vitest) across client, server, and frontend

**Risks/Trade-offs**:

- ⚠️ Four layers means four test commands to run (can be unified in CI)
- ⚠️ E2E tests are slower (necessary for confidence)
- ⚠️ Playwright setup has small overhead (well-documented, widely adopted)

**Before MVP completion**:

- All four test suites must pass
- Coverage targets: >80% for business logic, >50% overall (pragma for boilerplate)
