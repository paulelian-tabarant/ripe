# Decision: Run Renovate Daily, Gate Creation with Renovate Schedules

**Status**: Accepted  
**Date**: 2026-10-18  
**Deciders**: Paul-Elian Tabarant

## Context

[ADR-011](ADR-011-dependency-management.md) set the update cadence (weekly batch for minor/patch,
individual PRs for majors). The first implementation drove that cadence from the self-hosted
workflow's own `cron` triggers (weekly and monthly, each with its own config file) and left
Renovate's `schedule` unused, so there was a single clock.

That left existing PRs stale between runs. Lock file maintenance and the weekly minor/patch PR both
rewrite `pnpm-lock.yaml` and both automerge. When one merged, the other conflicted, and nothing
rebased it until the next weekly run (PR #77 sat conflicted after lock file maintenance #78 merged
two hours after #77 was opened). Renovate does regenerate the lockfile on rebase, but only when it
runs.

## Decision

- Run the Renovate workflow **daily** (`0 2 * * *`), with a single `renovate.json`.
- Express the cadence in Renovate's `schedule` instead of in cron triggers:
  - minor/patch/pin/digest: `before 4am on monday`
  - lock file maintenance: `before 4am on monday`
  - major: `before 4am on the first day of the month`
- Remove `.github/renovate/weekly.json` and `monthly.json`, the `mode` input, and the two
  `test-renovate-*` PR dry-run jobs (replaced by a single `test-renovate` label).

## Rationale

Renovate never creates branches outside a schedule, but `updateNotScheduled` defaults to `true`, so
it still rebases and updates **existing** PRs on every run. With `rebaseWhen: auto` and automerge
enabled, PRs that fall behind base are rebased. A daily run therefore heals a lockfile conflict
within a day, while new PRs keep the weekly and monthly cadence from ADR-011.

Lock file maintenance cannot be grouped into the weekly PR (Renovate never groups it), so keeping
it separate and healing conflicts is the way to keep transitive-dependency updates.

## Alternatives Considered

- **Keep cron-driven cadence, trigger a run on merge to `main`** — keeps one clock, but needs an
  extra workflow trigger and still leaves a stale PR when a run fails.
- **`prConcurrentLimit: 1`** — avoids concurrent lockfile PRs, but delays one of them by a week and
  unverified whether lock file PRs count toward it.
- **Drop lock file maintenance** — removes the race, but transitive-only updates would only arrive
  when a direct bump pulls them in.
- **Move lock file maintenance to a monthly schedule** — only makes collisions rarer, doesn't fix
  stale PRs.

## Consequences

**Positive**:

- ✅ A conflicted or behind-base Renovate PR is rebased and automerged within a day
- ✅ Transitive dependencies keep being refreshed weekly
- ✅ One config file and one workflow path instead of two modes

**Risks/Trade-offs**:

- ⚠️ Two clocks to reason about: the daily cron decides when Renovate runs, `renovate.json`'s
  `schedule` decides what it may create
- ⚠️ ~7 runs a week instead of 2-3, mostly near no-ops
- ⚠️ The weekly lock file and minor/patch PRs can still be created in the same run and conflict; the
  next daily run now resolves it
- ⚠️ A manual dispatch can no longer force a monthly-only run, and the `test-renovate` dry run only
  proposes new updates inside a schedule window
