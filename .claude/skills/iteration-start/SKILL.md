---
name: iteration-start
description: Runs a full development iteration in this repo end-to-end — specify behavior via iteration-specification, propose a plan, implement via parallel subagents, run checks, review via iteration-code-review, auto-fix findings, and open a PR with an iteration-recap summary. Use whenever the user wants to build or fix something and have Claude drive the whole cycle to a PR — "let's build X", "implement Y end to end", "run the dev iteration for Z", "take this from idea to PR" — including resuming one already in progress, e.g. "go on with the implementation of the plan in <path>", "continue the dev iteration", "pick up where we left off on this plan" when an approved plan doc already exists (such as under `docs/_plans/`) — not for one-off small edits the user wants to review step by step themselves.
---

# Iteration Start

Drive one feature/fix from a loose idea to an open PR, without checking back in
except where explicitly gated below.

## Workflow

1. **Specify.** Invoke this repo's `iteration-specification` skill and use its
   output as-is — that skill owns everything about what "specified" means
   here (whether to skip straight to an existing approved doc, how behavior
   gets clarified, and what form the resulting test strategy/acceptance
   criteria take). Its output feeds step 2 — implementer prompts should point
   at it as what to build and test against, not re-derive anything from
   scratch.

2. **Propose a plan.** If step 1 resumed from an existing approved plan doc
   with its own subtask breakdown, use that breakdown directly instead of
   proposing anew. Otherwise, break the work into subtasks. For each: which
   files it touches, what it does, and how to tell it's done. Call out which
   subtasks are independent (touch disjoint files, no shared state) vs which
   must be sequential. Present the plan to the user as a condensed bullet
   summary (not the full plan-file prose) and keep iterating on it — revise on
   feedback, don't proceed on silence or a vague "sounds fine." Only move to
   step 3 (Implement) once the user clearly states they're ready to proceed.

3. **Implement.**
   - TDD, per unit of work: red (write a failing test) → simplest implementation
     that makes it pass → green → refactor. Applies to each implementer
     dispatched below — include it explicitly in their prompts, it's a
     constraint on how they build, not an optional nicety.
   - Record the branch this iteration is building on (`git rev-parse HEAD`) before
     dispatching anything — this is the merge base for every subtask branch and
     for the final review/PR diff.
   - For each independent subtask, dispatch an `Agent` call with
     `isolation: "worktree"`. Dispatch all independent subtasks' `Agent` calls in
     a single message so they run in parallel. Sequential/dependent subtasks go
     in their own message, after the subtask they depend on returns.
   - Each implementer prompt must be self-contained: the subtask's description,
     the files it owns, relevant interfaces from other subtasks it depends on,
     and an instruction to commit its work when done. It should not need the
     rest of this conversation's history.
   - Instruct it to favor dedicated code navigation/editing tools over raw
     file reads/writes when available, falling back to raw reads/writes
     otherwise. If such tools are available, have it do a quick test
     read+write early on and confirm the change actually appears on its
     current branch/worktree (e.g. via `git status`/`git diff`) — if it
     doesn't, stop and report that back to you as a blocker instead of
     continuing to edit blind.
   - If only one subtask exists, dispatch a single implementer — parallelism is
     a means, not a requirement.

4. **Merge.** For each implementer that returns a worktree/branch, merge it back
   into the iteration's working branch, one at a time (`git merge <branch>`).
   Resolve trivial conflicts yourself; if a conflict isn't trivial (both sides
   meaningfully changed the same logic), stop and ask the user which should win.

5. **Run checks.** Run this project's checks yourself, directly via Bash — do
   not delegate this to a subagent. Use `pnpm --filter <package> ci:checks` for
   each touched package (`api`, `./cli`, `web`), per this repo's CLAUDE.md.

6. **Review.** Dispatch one subagent to review the diff from the recorded merge
   base to `HEAD`, instructing it to use this repo's `iteration-code-review` skill.
   Give it the merge-base SHA and the working branch — don't make it guess the
   diff range. Instruct it to favor dedicated code navigation tools over raw
   file reads when available, falling back to raw reads otherwise.

7. **Fix.** Dispatch exactly one subagent with both: any failing check output
   from step 5, and the full findings list from step 6. Instruct it to:
   - Fix every clear-cut finding (a concrete bug, standards violation, or
     failing check with an obvious correct fix) without asking anyone.
   - NOT guess on findings that are genuinely ambiguous or that conflict with
     an explicit decision from Specify (step 1) — instead return those,
     unfixed, as a separate "needs a decision" list alongside what it did fix.
   - Commit its fixes when done.
   - Favor dedicated code navigation/editing tools over raw file reads/writes
     when available, falling back to raw reads/writes otherwise. If such
     tools are available, do a quick test read+write early on and confirm
     the change actually appears on the working branch (e.g. via `git status`)
     — if it doesn't, stop and report that back as a blocker instead of
     continuing to edit blind.

8. **Gate on ambiguity.** If the fixer returned any "needs a decision" items,
   stop and present them to the user — do not resolve them yourself and do not
   continue to step 9 until they're resolved. Otherwise, continue.

9. **Re-run checks.** Run the project checks again yourself (same as step 5).
   If they still fail, dispatch one more fix subagent with the new failure
   output, then re-run. There is no second review pass — review happens once,
   in step 6.

10. **Recap and open the PR.** Generate a recap using this repo's `iteration-recap`
    skill for the working branch against its base. This step is not done once
    the recap text exists — immediately continue in the same turn to push the
    branch and run `gh pr create` using that recap verbatim as the `--body`.
    Printing the recap to the user and stopping there is an incomplete step
    10, not a handoff point. Do this without asking for confirmation first —
    invoking this skill is the standing authorization for the PR it produces.

11. **Mark the user story done.** If this iteration is driven by a spec under
    `docs/spec/user-stories/`, update that doc's `**Status**` line to `Done`
    (this repo's existing convention, e.g. commit `4f9643a`), commit it, and
    push — updating the PR just opened in step 10 rather than opening a
    second one.

12. **Suggest process improvements.** Invoke this repo's `iteration-retro` skill,
    pointing it at this iteration's transcript, the plan doc (if any), and the
    PR/diff just opened. It covers auto-allow candidates, underused tools,
    missing STANDARDS.md/CLAUDE.md coverage, and tooling gaps — don't
    re-derive that checklist here. Present its output to the user; don't apply
    any of it yourself unless asked.

## Edge cases

- **Task doesn't decompose into independent subtasks** (e.g. a small, tightly
  coupled change): skip parallelism, dispatch one implementer for the whole
  thing. Don't force an artificial split to satisfy step 2 — a single unit of
  work is a valid plan.
- **An implementer subagent asks a question mid-task:** answer it yourself from
  the plan/clarified intent; don't silently guess and don't forward it to the
  user unless it reveals a genuine gap the Specify step (1) missed — in that
  case, treat it like step 8's gate.
- **Checks fail before review can even run** (step 5, first pass): don't
  dispatch a fixer yet — that only happens once, bundled with review findings
  in step 7. Note the failures and carry them into step 7's fixer dispatch.
- **No PR-worthy findings from review:** step 7's fixer still runs (to catch
  any check failures) but may have nothing to fix from review; that's fine,
  it just reports nothing to fix on that front.
- **`gh` not installed/authenticated:** the `iteration-recap` skill already handles
  this by falling back to git history for the recap; `gh pr create` itself has
  no fallback — report the failure to the user rather than silently stopping
  short of a PR.
