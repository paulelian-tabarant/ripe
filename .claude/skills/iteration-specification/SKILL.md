---
name: iteration-specification
description: Clarifies a feature/fix's expected behavior one question at a time, then produces a test strategy (granularity, typology, stubbed dependencies) and BDD-style (Given/When/Then) acceptance criteria — replacing (or appending to) the Acceptance Criteria section of the relevant docs/spec/user-stories/ doc once confirmed. Use as the specification phase before an implementation plan is proposed, whenever behavior needs clarifying and turning into concrete test cases before code is written — "spec this out", "what tests would you write", "clarify the acceptance criteria" — or when `iteration-start` reaches its clarify/specify step.
---

# Iteration Specification

Turn a loose idea into: clarified behavior, a test strategy, and BDD acceptance criteria —
before any implementation plan or code exists.

## Workflow

1. **Check for an existing approved spec.** If the user points at an approved plan
   file (e.g. `docs/_plans/*.md`, status "Approved") and asks to continue/resume/go
   on with implementation, treat steps 2–6 as already satisfied — don't re-clarify,
   re-derive a test strategy, or rewrite cases. Use that doc's stated behavior, test
   approach, and acceptance criteria (its "Execution notes"/TDD guidance, if present)
   as this skill's output. Only fall back to steps 2–6 if that doc is incomplete,
   stale, or ambiguous about what to build or test next.

2. **Clarify intent.** Ask the user one question at a time — no batching — until the
   behavior is unambiguous: what triggers it, expected inputs/outputs, edge cases, error
   handling, what's explicitly out of scope. Prefer multiple-choice questions
   (`AskUserQuestion`) when the option space is small. Stay in chat — don't write a spec
   doc for this step. Stop asking once another question wouldn't change the test strategy
   or cases below.

3. **Define the test strategy.** State, don't just imply:
   - **Granularity**: per root `STANDARDS.md`'s "Coarse-grained tests over fine-grained
     ones" — default to the coarsest granularity the target package already relies on
     (page-level for `web`, endpoint-level for `api`, command-level for `cli`; see each
     package's own `STANDARDS.md`), exercising the real path from entry point down to the
     stubbed I/O boundary rather than one test per internal layer. Drop to a finer
     granularity only where the package already does (e.g. `api`'s one pure-unit
     `config.test.ts`) or the behavior is critical/complex enough to need isolation.
   - **Typology**: what shape each test takes — state assertion, contract/shape assertion,
     error-path, behavior/interaction — whichever fits the case, not one typology forced
     onto everything.
   - **Stubbed dependencies**: what's faked and at which boundary, per this repo's
     philosophy of stubbing only at the true I/O boundary (root `STANDARDS.md`) — e.g. MSW
     at `web`'s network boundary, `nock` in `cli`, a real in-memory `better-sqlite3` DB in
     `api` (not mocked).

4. **Write cases as BDD acceptance criteria.** One `Given/When/Then` per behavior or edge
   case surfaced in step 2, grouped by file or granularity where that aids readability.
   These are what implementers write tests against — concrete enough that "done" is
   unambiguous, not a restatement of the test strategy.

5. **Present and confirm.** Show the user a condensed summary — test strategy + BDD cases,
   not full prose — and keep iterating on it. Don't proceed to step 6 on silence or a
   vague "sounds fine"; only once the user clearly confirms.

6. **Replace the user story's acceptance criteria.** Once confirmed, in the relevant
   `docs/spec/user-stories/*.md` doc, if one exists for this work: replace its
   `## Acceptance Criteria` section (or equivalent) wholesale with the confirmed BDD
   cases from step 4 — these supersede whatever format was there before (e.g. plain
   checkboxes), since BDD cases are now the canonical acceptance-criteria format. If the
   doc exists but has no such section, append one. Also fold any newly-clarified behavior
   from step 2 into the doc's other sections (Frontend/API Behavior, Scope, etc.) if it
   isn't already written there. If no user story doc exists for this work, skip this step
   — the in-chat cases are the spec of record for this iteration.

## Output shape

```markdown
### Test strategy
- Granularity: ...
- Typology: ...
- Stubbed dependencies: ...

### Acceptance criteria (BDD)
- Given ..., when ..., then ...
- Given ..., when ..., then ...
```

## Edge cases

- **No user story doc exists for this work**: skip step 6; the cases drafted here are the
  spec of record.
- **Behavior already fully covered by the existing user story doc, with matching BDD
  acceptance criteria already in place**: step 6 is a no-op — don't rewrite what already
  matches.
- **User revises an answer mid-specification**: update any already-drafted cases affected
  by the revision before moving on — don't leave stale cases alongside the correction.
