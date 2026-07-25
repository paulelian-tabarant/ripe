---
paths:
  - "docs/spec/user-stories/**/*.md"
---

# Shipped user stories are read-only

Once a story's **Status** is `Done` (shipped), it is read-only — never edit it to reflect later
design changes, even if a later decision supersedes part of its behavior.

**Why**: a user story is a historical record of what was actually built and shipped in that
slice. Editing a shipped one after the fact erases the record of what the original design was.

**How to apply**: when a decision changes behavior described in an already-shipped story (e.g.
via a new/superseding ADR), write a **new** story describing the new behavior, and have it
reference both the ADR and the story it supersedes. Leave the original story's content untouched
— only its cross-references from newer docs should point forward. This mirrors how ADRs
themselves get a `Superseded by ADR-XXX` status line rather than being rewritten in place.

Non-shipped stories (`Status: Ready for planning` or similar) are still safe to edit directly
when scope changes before implementation.
