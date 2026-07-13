---
name: pr-comments-triage
description: Triage inline review comments on an open PR using the Conventional Comments format (conventionalcomments.org — praise, nitpick, suggestion, issue, todo, question, thought, chore). Classifies each comment, fixes the actionable ones (issue, suggestion, todo, chore) directly in code, and surfaces judgment-call ones (question, thought, praise, nitpick) as a decision list instead of guessing at a reply. Once aligned with the user on what's addressed, resolves the corresponding GitHub review threads for real — never before that, and never a reply comment. Use whenever the user wants to address, work through, or triage PR review feedback — "address the comments on #42", "go through the PR feedback", "what should I do about this reviewer's comments". Distinct from iteration-recap (summarizes a PR's changes) and iteration-code-review (reviews your own diff before posting) — this is about feedback already left on an open PR.
---

# PR Comments Triage

Go through a PR's inline review comments, classify each by Conventional Comments intent, and
split the work: fix what's fixable yourself, and hand back only what genuinely needs a human
decision. The point is to save the tedious "read every comment, figure out what it's asking for"
pass — not to guess at answers to comments that are actually asking the author to think, not act.

## Workflow

1. **Identify the target PR.** If the user named a PR number, URL, or branch, use it. If they
   didn't, let the script auto-detect the current branch's open PR.

2. **Fetch the comments.** Run the bundled script instead of hand-rolling `gh api` calls — it
   already handles auto-detection and pagination:

   ```bash
   .claude/skills/pr-comments-triage/scripts/gather_pr_comments.sh [ref]
   ```

   This pulls **inline, unresolved** review comments only — the ones attached to a specific
   file/line, where a Conventional Comments label actually makes sense. Top-level PR conversation
   comments and review approval/changes-requested summaries aren't included; those read more like
   a recap of the review than line-level feedback to act on. Comments on a thread already marked
   resolved on GitHub are filtered out before you see them (the script checks `isResolved` via
   GraphQL) — don't re-triage those.

3. **Classify each comment.** Conventional Comments labels, in the author's own words:

   | Label | Meaning |
   | --- | --- |
   | `praise` | Highlights something good. Doesn't ask for a change. |
   | `nitpick` | Minor, non-blocking style/polish point. |
   | `suggestion` | Proposes a specific change. |
   | `issue` | Points out a problem with the current code. |
   | `todo` | Small, necessary change — often paired with `(blocking)`. |
   | `question` | Asks something the author needs to answer — not a request for a change. |
   | `thought` | Non-blocking idea worth reflecting on, not necessarily now. |
   | `chore` | Process/task not directly about code quality (e.g. "update the changelog"). |

   Some comments will use the label explicitly (`suggestion: extract this into a helper`,
   `issue (blocking): this leaks the connection`). Most won't. For unlabeled comments, infer
   intent from what the sentence is actually doing:
   - Ends in `?` and is asking the author to explain or justify something → `question`.
   - Proposes a concrete alternative ("consider...", "what about using X instead", "maybe
     extract...") → `suggestion`.
   - States a clear defect in plain terms ("this will break when...", "this is wrong because...")
     → `issue`.
   - Musing, exploratory, "I wonder if...", "not for this PR, but..." → `thought`.
   - Pure compliment, no ask → `praise`.
   - Minor style/naming/formatting remark with no functional stake → `nitpick`.
   - `nit:` is a common shorthand for `nitpick`; treat it the same.

   A `(blocking)` decoration always makes a comment actionable regardless of label — the
   reviewer is saying it must be resolved before merge.

4. **Split into two buckets and handle them differently:**

   - **Actionable** (`issue`, `suggestion`, `todo`, `chore`, or anything marked `(blocking)`):
     treat these like ordinary PR feedback. Make the code change. If you judge a suggestion
     shouldn't be applied as written, don't silently skip it — say why in the output, the same
     way you'd explain it in a review reply.
   - **Needs human judgment** (`question`, `thought`, `praise`, `nitpick`): these aren't requests
     for a code change, they're requests for the PR author's actual opinion, or don't need a
     response at all. Don't invent an answer to a question or decide whether a `thought` is worth
     acting on — that's exactly the judgment call this skill exists to route to the user instead
     of guessing at. Surface each one with enough context to decide quickly, without doing the
     deciding.

5. **Verify before reporting.** After making the actionable code changes, run lint, typecheck, and
   the scoped tests for every package you touched (per the root `CLAUDE.md`) before writing the
   report. A comment isn't actually addressed if it leaves the branch failing checks — fix any
   failures the same way you would for any other coding task, then re-run until clean.

6. **Report using this structure:**

   ```markdown
   ## PR #<number>: <title>

   **Addressed:**
   - `path:line` — [<label>] <one-line gist of the comment>. <what you did, or why you didn't>.

   **Needs your input:**
   - `path:line` — [<label>] "<quoted comment>"
     <one-line note on what a reasonable response might be, if it helps them decide faster>
   ```

   Omit either section if it's empty (e.g. a PR with only nitpicks has no "Addressed" section).
   If a comment's label is inferred rather than explicit, no need to flag that in the report —
   the classification should just be right, not narrated.

7. **Confirm, then resolve.** The report in step 6 is a proposal — wait until you and the user
   are actually aligned on what got addressed and what was decided on the judgment-call items
   before touching GitHub. Once aligned, resolve the corresponding review threads for the
   comments that were acted on or explicitly settled — not a reply saying "resolved", an actual
   resolved conversation, since that's what the label means to a reviewer scanning the PR:

   ```bash
   .claude/skills/pr-comments-triage/scripts/resolve_review_threads.sh <pr-number> <comment-id> [comment-id...]
   ```

   `pr-number` and each `comment-id` come straight from `gather_pr_comments.sh`'s output (the
   `=== PR ===` number and the `--- comment <id> ...` headers). Leave alone any comment the user
   wants to keep open for further discussion — only resolve what's actually settled.

## Edge cases

- **No inline comments found**: say so plainly, nothing to triage.
- **Outdated diff position** (comment's `line` is null because the diff moved): the script falls
  back to `original_line` and marks it `[outdated diff position]`. Still classify and handle it —
  the code the comment refers to may still exist even if the line numbers shifted; check before
  assuming it's stale.
- **Threaded replies** (`in_reply_to_id` present): classify the root comment, and read any replies
  as context for what's already been discussed — don't re-litigate a question the author already
  answered in a reply.
- **Never auto-reply on GitHub, and never resolve a thread before the user has confirmed it's
  settled.** The report in step 6 is a proposal, not a done deal — the user might want a change
  reverted, a different answer to a question, or to leave something open for the reviewer to see.
  Only step 7, after that confirmation, touches GitHub, and only to resolve — never to post a
  comment.
- **Already-resolved threads**: `resolve_review_threads.sh` checks `isResolved` before mutating
  and just reports "already resolved" rather than erroring — safe to re-run on the same comment
  IDs.
