# Coding Standards — `web/`

Package-specific standards for `web/`. These supplement the general rules in
[`../STANDARDS.md`](../STANDARDS.md) and the architecture notes in [`CLAUDE.md`](CLAUDE.md).

## Architecture

- **SPA, dev vs. prod**: Vite serves the app in dev (`vite`) with hot module reload; in
  production it's built to static assets (`vite build`) and served by the API server — there is
  no separate web server or SSR.
- **Client-side routing with `react-router`**: `src/App.tsx` declares routes with `<Routes>`/
  `<Route>`; `src/main.tsx` wraps `<App />` in a `<BrowserRouter>` for the real app (tests use
  `<MemoryRouter>` instead — see Testing below).

## Testing

General testing principles live in [`../STANDARDS.md`](../STANDARDS.md). This section covers
only the `web/`-specific test conventions.

- **MSW at the network boundary**: HTTP is intercepted with `msw` (`src/mocks/server.ts`), not by
  mocking `fetch` directly — the same "intercept at the boundary, not the internals" philosophy
  `cli/` applies with `nock`. `server` starts with no handlers; each test registers what it needs
  with `server.use(...)` (e.g. `HomePage.test.tsx` defining a success handler in one test and an
  error handler in another) rather than sharing a default handlers module — handlers stay local to
  the test that needs them instead of accumulating in a shared file most tests don't use.
- **Page-level tests with React Testing Library**: tests render a page (or `App`) and assert on
  what a user would see (`screen.getByText`/`findByText`), not on implementation details or
  internal state.
- **`MemoryRouter` for router-dependent tests**: tests that need routing context render inside
  `<MemoryRouter>` (optionally with `initialEntries`) instead of a real browser URL, so multiple
  routes (e.g. `/` vs. an unknown path for the 404 page) can be exercised in the same test file —
  see `src/App.test.tsx`.
- **`@testing-library/user-event` for interaction-driven tests**: available for simulating user
  interaction (clicks, typing); not yet used since the current pages have no interactive
  elements.
