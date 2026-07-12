# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev           # vite dev server, with /api proxied to http://localhost:3000
npm run build         # vite build → static assets
npm run preview       # preview the production build locally
npm run lint          # Biome ci: lint + format check + import-sort check (src/)
npm run typecheck     # tsc --noEmit
npm run test          # vitest run
npm run ci:checks     # lint + typecheck + test in one shot
```

## Architecture

React + Vite SPA with `react-router-dom` for client-side routing. Currently a walking skeleton:
one real page (`HomePage`) plus a `NotFoundPage` catch-all — no feature functionality yet. See
[`web/STANDARDS.md`](STANDARDS.md) for the full architecture and testing conventions.

## Key Conventions

- **Dev-server API proxy**: `vite.config.ts` proxies `/api` to `http://localhost:3000` in dev, so
  the SPA can call relative paths like `/api/health` without CORS or hardcoded hosts; in
  production the built assets are served by the API server itself, so the same relative paths
  resolve naturally.
- **Testing**: MSW intercepts HTTP at the network boundary, tests are page-level with React
  Testing Library, and router-dependent tests use `MemoryRouter` — see
  [`web/STANDARDS.md`](STANDARDS.md#testing) for details.
- **404 fallback**: `App.tsx` declares a catch-all `<Route path="*" element={<NotFoundPage />} />`
  so unmatched client-side routes render `NotFoundPage` instead of a blank page.
