---
paths:
  - "**/*.test.ts"
  - "**/*.test.tsx"
---

# Name tests after observable behavior, not implementation details

Name a test after the observable behavior it verifies — the user-facing outcome, output, exit
code, or files written — not an internal function, parameter, or other implementation detail
used to produce it. This is the same notion of "behavioral" as `STANDARDS.md`'s "Behavioral over
implementation-detail assertions" rule: observable through the real entry point (HTTP response,
CLI output/exit code, files written, rendered UI), as opposed to an internal implementation
detail (a specific function/parameter being invoked, an internal constraint checked in isolation)
that isn't itself observable behavior. That rule governs what a test *asserts on*; this one
extends the same standard to what a test's *title says* — a title naming an internal detail is
just as much a leak of implementation into the test as an assertion on one would be.

**Why**: a test title that names an internal detail (a function name, an injected parameter) goes
stale the moment that detail is renamed or refactored, even though the behavior it verifies hasn't
changed. A reader shouldn't need to know an implementation's internals to understand what the
test is pinning down.

**How to apply**:

- Ask whether the title would still make sense to someone who's never seen the implementation —
  if it names a specific function/parameter (`calls X`, `never calls Y`), rewrite it around what
  that call accomplishes from the outside instead.
- Prefer `'never asks the user to reuse an existing server URL when no .ripe/settings.json exists
  yet'` over `'never calls confirmServerUrlPromptFn when no .ripe/settings.json exists yet'`.
- Same idea for control-flow phrasing: prefer `'prompts for and uses a new server URL when the
  user declines to reuse the existing one'` over `'falls through to the serverUrl prompt loop
  when the user declines the existing serverUrl'` — "falls through to ... loop" describes the
  code's internal branching, not what a user of the CLI would observe.
- See `cli/tests/commands/init.test.ts` for both examples already applied in this repo.
