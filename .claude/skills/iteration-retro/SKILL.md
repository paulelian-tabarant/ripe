---
name: iteration-retro
description: End-of-iteration self-assessment across four fixed dimensions — auto-allow candidates, underused tools/skills, missing STANDARDS.md/CLAUDE.md coverage for decisions made this iteration, and tooling gaps (skills/plugins/MCPs). Use as the last step of dev-iteration, or standalone whenever asked to reflect, retro, or suggest process improvements on finished work.
---

# Iteration Retro

Reflects on *how* a piece of work got done, not what it produced. Runs four fixed checks and
turns friction into concrete, named suggestions. This skill only proposes — it never edits
`.claude/settings.json`, `STANDARDS.md`, `CLAUDE.md`, or anything else itself unless the user
asks it to apply a specific suggestion afterward.

## When to use

- Invoked as the final step of `dev-iteration` (see that skill's last workflow step).
- Standalone, whenever the user asks to reflect, retro, or wants process-improvement
  suggestions on a branch, PR, or session that just finished.

## Inputs

Gather what's available before running the four checks:

- This conversation's transcript (or the relevant portion of it, if the iteration was long) —
  the actual tool calls made, permission prompts hit, and corrections received.
- The plan doc the work followed, if any — especially a "Decisions made during planning"
  section, which is the clearest record of *decisions* vs. just *code*.
- The diff/PR produced, and any review findings from it.

## The four checks

Run all four; skip a heading entirely in the output if that check found nothing — don't force a
finding to fill a section.

1. **Auto-allow candidates.** Scan this session's tool calls for ones that hit a permission
   prompt but were read-only, repeated more than once, or otherwise clearly safe, and are not
   already covered by `.claude/settings.json`'s allowlist. Prefer invoking the built-in
   `fewer-permission-prompts` skill directly (it already does this scan properly) over
   re-implementing it here — just make sure it's scoped to this iteration's activity, not the
   whole history.

2. **Underused tools.** Find moments where a dedicated tool or skill existed and was the better
   choice, but plain reasoning, raw `Read`/`Edit`/`Grep`, an ad hoc approach, or the wrong CLI
   for this repo's package manager was used instead — e.g. a project skill (`ripe-code-review`,
   `pr-recap`, `verify`, `spec-refinement`) that fits but wasn't invoked, the Playwright MCP
   available for UI verification but skipped when a frontend change shipped untested in a
   browser, or `npm`/`npx` reached for in a repo pinned to `pnpm` (this repo's `packageManager`
   field) when a `pnpm` equivalent exists. Only flag tools available to everyone working in this
   project (skills, MCPs, CLIs already in this repo's toolchain) — not a given user's personal
   global setup, which won't be there for someone else running the same iteration. Name the
   specific tool and the specific moment it should have been reached for — not a generic "use
   more tools" note.

3. **Missing STANDARDS.md / CLAUDE.md coverage.** Compare decisions actually made or enforced
   during this iteration — implementer prompts that had to spell something out, review findings
   that cited an unwritten rule, a plan doc's "Decisions made during planning" section, fixer
   commits — against what's currently written in root `STANDARDS.md`, `api/STANDARDS.md`,
   `cli/STANDARDS.md`, `web/STANDARDS.md` (if it exists), and the relevant `CLAUDE.md` files.
   Flag anything that had to be re-decided, re-explained to a subagent, or caught only in review
   because it wasn't documented anywhere. For each, propose both angles explicitly and separately
   — the exact STANDARDS.md rule to add (if it's a rule about code) *and* the exact CLAUDE.md
   directive to add (if it's a rule about process/workflow/how Claude should act) — a single
   finding can warrant one, the other, or both; don't collapse them into one vague "document
   this" suggestion.

4. **Tooling gaps.** Based on repeated manual steps, workarounds, or things done by hand this
   iteration, suggest concrete additions: a new project skill, a Claude Code plugin, or an MCP
   server that would remove that manual step next time. Only propose something specific and
   named (e.g. "a `web/STANDARDS.md` skill-scoped review pass" not "better review tooling"); if
   nothing concrete surfaced, say so for this check rather than inventing one.

## Output

Present as a short bullet list, one heading per check that found something (in the order above).
Each bullet: the concrete observation, then the concrete suggestion. Do not apply any of it —
present it and stop, unless the user explicitly asks you to act on a specific item.
