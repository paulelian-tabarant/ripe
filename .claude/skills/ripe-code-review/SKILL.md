---
name: ripe-code-review
description: Reviews a completed diff, branch, or PR in this repo. In this repo, "review" means checking the change against this repo's own written coding standards — STANDARDS.md (general rules), cli/STANDARDS.md, and api/STANDARDS.md (package-specific rules) — plus a judgment pass for bugs, performance issues, and security concerns that no written doc covers. Use this whenever the user asks to review, look over, or check finished work in this repo — "review this PR", "can you review my changes", "review this branch before I merge", "take a look at what I just wrote", "is this ready to merge" — even without the word "standards" anywhere, since that's what a review means here.
---

# Ripe Code Review

Review a diff along two axes:

1. **Standards compliance** — the rules this repo has actually written down for itself
   (`STANDARDS.md`, `cli/STANDARDS.md`, `api/STANDARDS.md`). Every finding here must trace back
   to a specific bullet in one of those files.
2. **Everything else that matters but isn't written anywhere** — bugs, performance issues, and
   security concerns. These findings are grounded in the diff itself and ordinary engineering
   judgment, not a doc citation.

Both passes matter — a change can be fully standards-compliant and still ship a bug.

## Workflow

1. **Figure out the diff.** If the user named a PR, branch, or ref, use it; otherwise default
   to the current working tree diff against the repo's default branch merge-base.

   ```bash
   git diff <merge-base>...HEAD    # or the equivalent for a named PR via gh
   git diff --name-only <merge-base>...HEAD
   ```

2. **Read the applicable standards files fully, before reading any diff.** Load them in this
   order so package-specific rules are understood as refinements of the general ones, not a
   separate rulebook:

   - `STANDARDS.md` (root) — always applies, to every changed file.
   - `cli/STANDARDS.md` — additionally applies to any changed file under `cli/`.
   - `api/STANDARDS.md` — additionally applies to any changed file under `api/`.

   A file under `web/` or elsewhere only gets the root `STANDARDS.md` rules — there's no
   package-specific standards file for it yet; don't invent one.

3. **Pass 1 — standards.** Walk the diff file by file, rule by rule. For each changed file,
   check its hunks against every rule that applies to it (general rules always, plus its
   package's rules). A rule is violated when the diff's own content contradicts it — not when
   you can imagine a hypothetical case elsewhere in the file that the diff didn't touch. Skip
   anything the diff doesn't actually exercise. Don't flag what static tooling already catches —
   formatting, explicit-return-types, unused-exports, and anything else Biome/tsc enforce are
   already gated by `pnpm lint`/`typecheck`.

   Exception: if new code in the diff types against, calls into, or otherwise formalizes a
   pre-existing violation in a file the diff didn't touch (e.g. a new interface whose signature
   locks in a return shape that already violates a rule), flag it. The diff is the point where
   fixing it stops being free — cementing the wrong contract into new code is worse than leaving
   the old violation alone.

4. **Pass 2 — bugs, performance, security.** Re-read the same diff hunks looking for concrete,
   diff-grounded issues in three categories:

   - **Bugs**: clumsy or unjustified casts (`as X`, `as unknown as X`, non-null assertions
     without a comment explaining why they're safe), unhandled execution paths (missing
     `catch`/`.catch()`, an `if`/`switch` that silently falls through a case the code needs to
     handle, array/object access that can be `undefined` but isn't checked), and anything else
     that would make the app crash or misbehave on a reachable input.
   - **Performance**: database or network calls issued inside a loop instead of batched, work
     that's accidentally O(n²) when O(n) is available, blocking/sync I/O on a path that's
     otherwise async.
   - **Security**: unsanitized input reaching SQL, a shell command, or a file path; secrets or
     tokens logged, hardcoded, or committed; a new route or command that bypasses this repo's
     existing access pattern.

   Same rule as pass 1: skip anything already caught by `tsc`/Biome (e.g. a genuine type error).
   A finding has to point at something the diff actually does, not a hypothetical edge case that
   requires unlikely conditions to reach — precision beats volume here.

5. **Report findings, most clear-cut first**, one line per finding:

   ```text
   path:line: [tag] what's wrong — why it matters. Fix: concrete suggestion.
   ```

   `[tag]` is `[standard-file § rule name]` for pass-1 findings, or `[bug]` / `[performance]` /
   `[security]` for pass-2 findings. Examples:

   ```text
   cli/src/commands/sync.ts:42: [cli/STANDARDS.md § No logging details in commands] `console.error` called directly inside a command instead of returning a typed result. Fix: return `{ status: 'error', message }` and let src/index.ts print it.
   api/src/services/projectService.ts:18: [performance] `db.prepare(...).get(id)` called inside a `for` loop over `projectIds`. Fix: batch with a single `WHERE id IN (...)` query.
   ```

   If a changed file has no findings, don't pad the report with a line saying so per file — just
   omit it. Only state "no findings" once, at the end, if that's true for the whole diff.

## Edge cases

- **No standards file applies** (e.g. a `web/`-only diff touching nothing `cli/`/`api/`-specific
  beyond the general rules): still check the general `STANDARDS.md` rules, they're workspace-wide.
  Pass 2 (bugs/performance/security) always applies regardless of package.
- **A rule reads as a judgment call** (e.g. KISS, coarse- vs fine-grained tests): state your
  reasoning briefly in the finding rather than asserting a violation flatly — these rules are
  intentionally about judgment, not a mechanical check.
- **Ambiguous whether a rule applies** (e.g. is this DI actually "never varied"?): check whether
  the diff itself demonstrates variation (a second call site, a test injecting a fake) before
  concluding it's dead flexibility — absence of evidence in the diff isn't proof, but don't flag
  it as a violation without a concrete reason either.
- **A pass-2 finding is speculative** ("this could fail if X" where X is far-fetched): leave it
  out. Only report what the diff's actual, reachable behavior does wrong.
