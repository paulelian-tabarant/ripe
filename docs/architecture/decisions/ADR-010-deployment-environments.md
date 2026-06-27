# ADR-013: Deployment Environments

**Status**: Accepted  
**Date**: 2026-06-18 (updated 2026-06-21)  
**Deciders**: Single developer MVP

## Context

The MVP needs hosting with an SQLite-backed Node.js server and a CI/CD pipeline. Key constraints:

- Persistent filesystem required (SQLite is file-based)
- Low operational cost
- Simple deployment model for a single developer

## Decision

Two environments — staging and production — as separate Railway services under one project, with
GitHub Actions for CI/CD.

| Environment | Service name         | Purpose                                          |
|-------------|----------------------|--------------------------------------------------|
| Staging     | `<app-name>-staging` | Integration testing, artificial invocations      |
| Production  | `<app-name>`         | Real daily use by the team                       |

**Railway Hobby plan** ($5/month): supports persistent volumes, always-on services, and custom
domains. Both services run within this single subscription.

**CI/CD pipeline** (GitHub Actions):

- On any push: lint, type checks, and tests (server + frontend)
- On merge to `main`: auto-deploy to staging; staging database resets on each deploy
- Production: manual trigger from Railway dashboard after staging validation
- Ad-hoc: manual deploy from any branch to staging

**Main branch**: protected — direct pushes are not allowed; changes land via pull requests only.

## Rationale

**Why Railway over Fly.io**:

Fly.io removed their free tier for new accounts; pay-as-you-go costs ~$4–6/month for two apps.
Railway Hobby at $5/month includes persistent volumes and always-on services at equivalent cost
with a simpler deployment model and an existing account.

**Why not Vercel/Netlify/Render**:

All three lack persistent filesystem support on their free tiers, which SQLite requires.
Render's free Node.js services use an ephemeral filesystem — data is lost on restart.
Vercel and Netlify are serverless-only and do not support long-running Node.js processes.

**Why staging resets on each deploy**:

Staging exists to validate deployments before they reach production. Resetting the database on
each staging deploy prevents test invocations from accumulating and polluting the staging
dashboard. Production data is never at risk.

## Alternatives Considered

- **A. Fly.io** — equivalent cost (~$4–6/month), no existing account, slightly more complex config
- **B. Single environment** — lower cost but no isolation before production
- **C. Turso (hosted SQLite)** — free, but requires changing the database driver and ADR-004
- **D. Railway + Turso** — free hosted SQLite, but adds a dependency for marginal benefit at MVP scale

## Consequences

**Positive**:

- ✅ Test invocations never pollute production
- ✅ Staging behaves identically to production (same Dockerfile, same service config)
- ✅ This project acts as a natural staging event source
- ✅ Safe to validate deployments on staging before promoting to production

**Risks/Trade-offs**:

- ⚠️ $5/month cost (Railway Hobby) — acceptable for MVP
- ⚠️ Staging database grows independently between resets — periodic cleanup if needed
