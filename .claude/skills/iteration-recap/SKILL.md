---
name: iteration-recap
description: Generate a short, reader-guiding markdown recap of a pull request or feature branch — what changed and why, not a line-by-line diff walkthrough. Use this whenever the user wants to sum up, recap, or summarize a PR, merge request, or feature branch — even without the words "PR" or "recap" explicitly, e.g. "what did we ship on this branch", "give me the highlights of #42", "catch me up on what's been done here", "write up this feature for the changelog", or "summarize what changed since main". Works for open PRs (via gh CLI) and local feature branches with no PR yet (via git log/diff against the merge-base). Prefer this over manually running git log/diff and eyeballing it — the skill's script gathers commits, diffstat, and PR metadata/CI status in one pass and the output format is built to orient someone skimming history later, not to review the diff itself.
---

# Iteration Recap

Produce a concise recap of a pull request or feature branch aimed at a reader who wasn't
there for the work and wants the gist fast: what changed, compared to the base branch,
and why. This is not a reviewer's line-by-line diff walkthrough, and it's not a risk/QA
checklist either — it's a summary someone skims six months from now to understand what a
branch was for. Stick to what changed and why; don't editorialize about CI status, review
state, or code quality unless the user asks for that separately.

## Workflow

1. **Figure out the target.** If the user named a PR number, URL, or branch, use it. If
   they didn't, default to the current branch.

2. **Gather the raw material.** Run the bundled script instead of reassembling this by
   hand with separate `gh`/`git` calls — it already knows the fallback logic:

   ```bash
   .claude/skills/iteration-recap/scripts/gather_recap_data.sh [ref] [base]
   ```

   - `ref` — PR number, PR URL, or branch name. Omit to use the current branch.
   - `base` — base branch to diff against. Omit to use the repo's default branch
     (or the PR's actual base, if a PR was found).

   The script prints, in order: PR metadata + CI status (if `gh` finds an open PR for the
   ref), the commit range being compared, the commit log, a diffstat, and a name-status
   file list. If no PR exists yet, it says so and falls back to comparing the branch
   against the base directly — that's expected for local feature-branch recaps, not an
   error.

3. **Find the purpose — the goal this work serves.** This is a different altitude than
   the technical decisions made while pursuing it (those go in "Decisions taken", step
   5) — easy to conflate, so keep them apart. Purpose is the user-facing or
   system-level reason the work exists at all: think "so that…", what becomes possible
   once this lands. E.g. "a first deployable increment of the backend, testable with
   real data, unlocked by a CLI command that registers a project." It's usually captured
   in a spec, user story, RFC, or product doc — something written to describe *intent*
   before or alongside the code — not in an ADR, which explains *how* a goal was
   pursued rather than why it exists.

   To find the purpose, check in roughly this order:
   - The PR description itself, if it states intent.
   - Referenced issues/tickets (`#123`, `Closes #...`) or commit bodies (not just
     subject lines — `git log --format` in the script only shows subjects, so re-run
     `git log -p` or `git show <hash>` on a specific commit if you need the full body).
   - A spec, user-story, or design doc elsewhere in the repo that this branch implements
     — look beyond the diff itself; these commonly live in directories like `docs/spec`,
     `specs/`, `docs/product`, or similar, and often *predate* the branch (the diff may
     only modify or reference one, not add it). Match by feature/epic name, ticket ID, or
     by what the code actually does, not just by proximity in the diff.
   - Only fall back to an ADR/decision doc's own stated context if nothing above exists,
     and even then frame it as the decision context it is, not as the feature's purpose.

   Write the "Why" section as the answer itself, drawn from whichever source had it —
   don't narrate which sources you checked or which came up empty (e.g. "the PR body is
   empty, but..."). Only say the purpose isn't documented if it's genuinely absent
   everywhere; even then, state that once, plainly, without listing each place you looked.

4. **Group the file list by area, don't list files.** The name-status output is raw
   material, not the report. Cluster changed files by what they represent (e.g. "API
   routes", "CLI commands", "CI/deploy config", "docs/ADRs") based on directory and
   naming — a reader wants to know "this touched the deploy pipeline and added a new API
   endpoint," not `git diff --name-status` reformatted as bullets.

5. **Pull out notable technical decisions.** This is where ADRs / design-decision docs
   belong (see step 3 for why they don't belong in "Why"). A decision is worth listing
   when it demonstrably shaped the code in this diff — e.g. an ADR whose choice is
   exactly what the new code implements — not just because its file happens to be in the
   diff; branches often carry along doc changes that aren't really why the code looks the
   way it does. If there are no such decisions, skip this section entirely rather than
   inventing one.

6. **Write the recap using this structure:**

   ```markdown
   ## [PR/branch title]

   [One or two sentences: what this does, in plain terms.]

   **Why:** [The purpose/goal from step 3 — not technical decisions. If undocumented,
   say so plainly instead of inventing one.]

   **What changed:**
   - [Grouped by area, e.g. "API: added project registration endpoint"]
   - [Not a raw file list — synthesize what each cluster of changes accomplishes]

   **Decisions taken:** [Omit this whole section if step 5 found nothing worth listing.
   Otherwise, one item per decision:]
   - [Decision, one line, if it needs no more than that — e.g. "Split config/cache into
     two files (ADR-016) so `projectId` can be git-shared while skill-ID caches stay
     developer-local."]

   ### [Subtitle per decision instead of a bullet, only when a decision needs real
   elaboration — trade-offs, alternatives considered, consequences — that wouldn't fit
   in one line without losing the point.]
   ```

   Keep the whole thing skimmable in under a minute — "Decisions taken" is the one
   section allowed to run longer if a decision genuinely needs it, but most decisions fit
   in a single bullet. If a branch touches 50 files across 3 packages, "What changed"
   should still be short; that's the point of grouping by area instead of enumerating.
   CI status, review state, and open follow-ups belong in a code review or PR status
   check, not this recap — leave them out even if they seem notable.

7. **Print it as literal markdown source, wrapped in a fenced code block
   (` ```markdown ... ``` `), not as rendered prose.** The user asked for markdown
   output specifically — likely to paste into a PR description, changelog, or doc — so
   the raw `##`/`**`/`-` syntax needs to survive, not get swallowed by the chat client's
   rendering. Don't write it to a file or post it anywhere unless the user asks — the
   recap is the answer to their question, not a deliverable to persist.

## Edge cases

- **No `gh` installed, or not authenticated:** the script silently falls back to the git
  comparison. Recap still works, just without PR title/description — mention in the
  recap that it's based on local git history only, since the "why" section will likely be
  thinner without a PR description to draw on.
- **Branch already merged:** `gh pr view` may still find it (closed/merged PRs are
  visible). Use the same structure — merged/open state isn't part of the recap.
- **No commits ahead of base:** say so directly — there's nothing to recap.
- **Monorepo/workspace projects:** group by package (e.g. `api/`, `cli/`, `web/`) before
  grouping by finer-grained area within a package — that mirrors how a reader thinks
  about the codebase.
