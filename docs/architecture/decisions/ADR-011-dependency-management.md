# Decision: Dependency Management Strategy

**Status**: Proposed  
**Date**: 2026-06-21  
**Deciders**: Paul-Elian Tabarant

## Context

The project needs a dependency update strategy that balances reproducibility, security, and review
overhead. Two main questions arise: how to express version constraints in `package.json`, and how
frequently to update dependencies.

## Decision

- Use **semver ranges** (e.g. `^1.2.3`) in `package.json` with a **committed lockfile**
  (`pnpm-lock.yaml`) as the actual pin.
- Automate updates via **Renovate** with the following PR grouping:
  - **Weekly batch PR** for all patch and minor updates (low-risk, low review burden)
  - **Individual PRs** for major version bumps (one per package, requires changelog review)
  - **Immediate PRs** for security vulnerability alerts, bypassing the weekly schedule
- Move a specific package to **independent single PRs** if it consistently breaks on minor updates
  (bad semver hygiene signal). Document the reason in the Renovate config when doing so.

## Rationale

The lockfile provides reproducible builds regardless of the range used in `package.json`. Ranges
only matter when running `npm update` / `pnpm update` — they define the upgrade boundary, not the
daily install. This gives reproducibility without locking `package.json` to a specific version.

Batching patches and minors reduces PR noise while keeping major updates isolated for deliberate
review. Starting coarse and going fine-grained per package only when a package earns it (through
repeated breakage) avoids premature complexity.

## Alternatives Considered

- **Exact pinning in `package.json`** — reproducible without a lockfile, but creates manual update
  burden and doesn't add value when a lockfile is committed. Ruled out.
- **One PR per dependency for all updates** — maximum traceability, but generates too much PR noise
  for stable ecosystems. Reserved for packages with known semver instability.
- **No automation, manual updates** — low overhead to set up, high overhead to maintain; security
  patches get delayed. Ruled out.

## Consequences

**Positive**:

- ✅ Reproducible builds via committed lockfile
- ✅ Low PR noise from routine patch/minor updates
- ✅ Security vulnerabilities are addressed promptly regardless of the weekly cadence
- ✅ Major updates remain deliberate and reviewable
- ✅ Per-package granularity is available when needed, without paying for it upfront

**Risks/Trade-offs**:

- ⚠️ Weekly batch PR can still fail CI if a minor update breaks something; the batch makes root
  cause slightly harder to isolate (acceptable trade-off given the fallback to individual PRs)
- ⚠️ Requires Renovate setup and maintenance (planned for epic 2)
