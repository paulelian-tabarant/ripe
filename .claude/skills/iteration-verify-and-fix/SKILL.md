---
name: iteration-verify-and-fix
description: Runs this repo's checks (`pnpm --filter <package> ci:checks`), fixes clear-cut findings — check failures plus any review findings passed in — and re-verifies until clean, gating on anything genuinely ambiguous by handing it back as a "needs a decision" list instead of guessing. Use whenever there's a diff to make checks-green and findings-clean: after finishing a piece of work yourself ("run the checks and fix what's broken"), after a code review pass, or as the check/fix/gate/re-check cycle inside `iteration-start`.
---

# Iteration Verify And Fix

Take a diff from "checks may be failing, findings may exist" to "checks green,
clear-cut findings fixed and committed" — without guessing on anything that's
actually a judgment call.

## Inputs

- Which package(s) to run checks for (`api`, `./cli`, `web`) — usually all
  packages touched by the diff.
- A findings list, if one exists (e.g. from `iteration-code-review`). Optional
  — this skill works fine with none, using only check output.

## Workflow

1. **Run checks.** Run this project's checks yourself, directly via Bash — do
   not delegate this to a subagent. Use `pnpm --filter <package> ci:checks`
   for each package in scope, per this repo's CLAUDE.md.

2. **Fix.** Dispatch exactly one subagent with both: any failing check output
   from step 1, and the findings list (if provided). Instruct it to:
   - Fix every clear-cut finding (a concrete bug, standards violation, or
     failing check with an obvious correct fix) without asking anyone.
   - NOT guess on findings that are genuinely ambiguous or that conflict with
     an explicit prior decision — instead return those, unfixed, as a
     separate "needs a decision" list alongside what it did fix.
   - Commit its fixes when done.
   - Favor dedicated code navigation/editing tools over raw file reads/writes
     when available, falling back to raw reads/writes otherwise. If such
     tools are available, do a quick test read+write early on and confirm
     the change actually appears on the working branch (e.g. via `git status`)
     — if it doesn't, stop and report that back as a blocker instead of
     continuing to edit blind.

   If there were no check failures and no findings at all, skip straight to
   reporting "nothing to fix" — don't dispatch a fixer with nothing to act on.

3. **Gate on ambiguity.** If the fixer returned any "needs a decision" items,
   stop and present them to whoever invoked this skill — do not resolve them
   yourself and do not continue to step 4 until they're resolved. Otherwise,
   continue.

4. **Re-run checks.** Run the project checks again yourself (same as step 1).
   If they still fail, dispatch one more fix subagent with the new failure
   output, then re-run. This skill does not re-review the diff — if the
   caller needs another review pass, that's a separate step outside this
   skill.

## Edge cases

- **Checks fail but no findings were passed in** (standalone use, no prior
  review): still run the Fix step — the fixer has check failures to act on
  even without a findings list.
- **No check failures and no findings passed in:** nothing to do — report
  that and stop; don't invent work.
- **Called after a review pass with zero findings:** the fixer still runs (to
  catch any check failures) but may have nothing to fix from review; that's
  fine, it just reports nothing to fix on that front.
