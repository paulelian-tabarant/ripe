---
paths:
  - "**/*.test.ts"
  - "**/*.test.tsx"
---

# Write and name tests around observable behavior

"Behavioral" in this repo means observable through the real entry point — an HTTP response, CLI
output/exit code, files written, rendered UI — as opposed to an internal implementation detail
(schema shape, an internal constraint checked in isolation, a specific function/parameter having
been invoked) that isn't itself observable. That distinction governs two separate things about a
test, not just one:

- **What it exercises and asserts on** — prefer observable behavior over an internal
  implementation detail (see `STANDARDS.md`'s "Write and name tests around observable behavior"
  rule for the full assertion-side guidance, including when a direct implementation-detail
  assertion is still warranted).
- **What its title says** — name a test after the observable behavior it verifies, not an
  internal function, parameter, or other implementation detail used to produce it. A title naming
  an internal detail leaks implementation into the test just as much as an assertion on one would.

**Why**: a test title (or assertion) that names an internal detail goes stale the moment that
detail is renamed or refactored, even though the behavior it verifies hasn't changed. A reader
shouldn't need to know an implementation's internals to understand what the test is pinning down.

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
- Applies to assertions the same way: don't assert a specific internal function was called, or
  inspect an internal schema shape, when the same guarantee is already provable by asserting the
  observable output/response/exit-code instead.
- See `cli/tests/commands/init.test.ts` for the naming examples already applied in this repo.
