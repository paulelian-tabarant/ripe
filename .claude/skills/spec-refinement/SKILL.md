---
name: spec-refinement
description: Clarifies ambiguous behavior for a feature/fix, one question at a time, and writes resolved scenarios back into the source user story doc under docs/spec/user-stories/ as concrete Given/When/Then scenarios. Use standalone to groom/refine a story before deciding to build it ("let's refine US-x.y", "flesh out the scenarios for this story"), or as a sub-step of another workflow that needs unambiguous behavior before planning (e.g. dev-iteration step 1). For ad hoc work with no source story, clarification stays in chat instead.
---

# Spec Refinement

Turn a loose idea or an underspecified user story into unambiguous, example-based
behavior — in the story doc, not just in chat.

## Workflow

1. **Clarify intent.** Ask the user one question at a time — no batching — until
   the behavior is unambiguous: what triggers it, expected inputs/outputs, edge
   cases, error handling, what's explicitly out of scope. Prefer multiple-choice
   questions (`AskUserQuestion`) when the option space is small. For ad hoc work
   with no source user story, stay in chat — don't write a spec doc just for
   this. Stop asking once another question wouldn't change the plan.

2. **Product/behavior questions only.** Technical or architectural scoping (which
   test tooling to bootstrap, which library, how to structure files) is not this
   skill's concern — decide it yourself using the repo's ADRs/STANDARDS/CLAUDE.md
   as the tiebreaker, and surface the resulting decision to whoever consumes this
   skill's output (e.g. dev-iteration's plan step) for the user to react to there,
   not as a question here.

3. **Reflect refinements in the story.** If this work is driven by a spec under
   `docs/spec/user-stories/`, every resolved ambiguity from step 1 gets written
   back into that doc as a concrete Given/When/Then scenario under a
   `## Scenarios` section (create it if missing) — don't leave the clarification
   sitting only in chat. The story doc, not the chat transcript, is the durable
   record of what was decided.

4. **Scope each scenario to what's observable and consumed today.** A `Then`
   clause asserts an effect this US actually makes visible or that something
   already reads — not a mechanism that exists only to serve a later US. If the
   thing being asserted (e.g. an id, a flag) has no reader yet because its
   consumer is explicitly out of scope, assert the observable UI effect instead
   (e.g. "the dropdown shows X as selected", not "the active project_id becomes
   X's id"). Revisit the scenario when the consuming US lands and gives it a
   real reader.

## Output

The story doc's `## Scenarios` section, updated in place. Callers (e.g.
dev-iteration) ground their planning in these scenarios directly rather than
re-deriving behavior from prose bullets.
