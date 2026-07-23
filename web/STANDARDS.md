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
- **Page shell via a layout route, not per-page imports**: `PageLayout` (`src/components/`)
  renders `<Outlet />` and is applied once in `App.tsx` as a parent `<Route>` wrapping every
  child route. Pages never import or render it themselves — this is how every page (current and
  future) gets consistent container width/padding/spacing for free.
- **Atomic design** (ADR-008): shared UI pieces live in `src/components/` (e.g. `LoadingSpinner`,
  `Message`, `ProjectSelector`), built as their own files from the start per that ADR rather than
  extracted later — pages compose them, they don't inline that markup.

## Styling

- **Tailwind CSS v4** via `@tailwindcss/vite` — no `tailwind.config.js`, no PostCSS config; styling
  is a single `@import "tailwindcss";` in `src/index.css`, imported once from `main.tsx`.
- **No custom design tokens**: use Tailwind's default spacing/type/color scale consistently
  (`gap-2`, `text-sm`, `zinc-900`, …) rather than arbitrary values (`mt-[13px]`, hex literals).
  Consistency comes from encapsulating color/variant choices inside shared components (e.g.
  `Message`'s `variant` prop maps to color classes in one place) rather than repeating raw utility
  classes at every call site.

## Testing

General testing principles live in [`../STANDARDS.md`](../STANDARDS.md). This section covers
only the `web/`-specific test conventions.

- **MSW at the network boundary**: HTTP is intercepted with `msw` (`src/mocks/server.ts`), not by
  mocking `fetch` directly — the same "intercept at the boundary, not the internals" philosophy
  `cli/` applies with `nock`. `server` starts with no handlers; each test registers what it needs
  with `server.use(...)` (e.g. `DashboardPage.test.tsx` defining a success handler in one test and
  an error handler in another) rather than sharing a default handlers module — handlers stay local
  to the test that needs them instead of accumulating in a shared file most tests don't use.
  `onUnhandledRequest: 'error'` (`vitest.setup.ts`) means every request a test triggers must have a
  matching handler, including ones that intentionally never resolve (e.g. `new Promise(() => {})`)
  to assert a permanent loading state.
- **Page-level tests with React Testing Library**: tests render a page (or `App`) and assert on
  what a user would see (`screen.getByText`/`findByText`), not on implementation details or
  internal state.
- **`MemoryRouter` for router-dependent tests**: tests that need routing context render inside
  `<MemoryRouter>` (optionally with `initialEntries`) instead of a real browser URL, so multiple
  routes (e.g. `/` vs. an unknown path for the 404 page) can be exercised in the same test file —
  see `src/App.test.tsx`.
- **`@testing-library/user-event` for interaction-driven tests**: used for simulating user
  interaction (e.g. `DashboardPage.test.tsx`'s dropdown-selection case).
- **RTL DOM cleanup between tests is manual**: `vitest.config.ts` doesn't set `globals: true`, so
  `@testing-library/react`'s auto-cleanup never registers its `afterEach` hook. `vitest.setup.ts`
  calls `cleanup()` explicitly — don't remove it, or DOM from every prior test in a file leaks into
  the next `render()` call.
