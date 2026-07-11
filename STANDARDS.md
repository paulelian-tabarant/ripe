# Coding Standards

This file documents general coding standards for this repository: style and structure rules a
contributor should follow when writing new code. It supplements — it does not replace — the
package-level `CLAUDE.md` files (root, `cli/CLAUDE.md`, `api/CLAUDE.md`), which describe
architecture, commands, and project-specific conventions in more depth.

Package-specific standards live alongside each package:

- [`cli/STANDARDS.md`](cli/STANDARDS.md)
- [`api/STANDARDS.md`](api/STANDARDS.md)

## General

These rules apply across the whole workspace (`api/` and `cli/`), which share the root
`biome.json` and `tsconfig.base.json`.

- **TypeScript strictness**: `strict: true` is enabled at the base and inherited by both
  packages. Don't weaken it locally (no `any` escape hatches, no `@ts-ignore`).
- **No unused exports**: keep modules' public surface limited to what's actually consumed;
  Biome's recommended rule set flags unused variables/imports — treat unused exports the same
  way during review.
- **Testing philosophy**: prefer real dependencies over mocks wherever the codebase already does
  (e.g. an in-memory SQLite database, a real temp directory, `nock` for HTTP boundary
  interception rather than mocking internal modules). Reach for a mock only when there's no
  practical way to exercise the real dependency in a unit test.
- **No duplicated code, in tests or implementation**: extract a shared helper instead of
  repeating the same block across test cases or across a command and its lib (e.g. the repeated
  `JSON.parse(readFileSync(...))` config-reading block across cases in
  `cli/tests/acceptance/init.test.ts` should be a shared helper).
- **KISS**: pick the simplest implementation that makes the code work; don't add abstraction or
  generality the task doesn't need.
- **Step-down rule**: order code so callers appear before what they call, top to bottom, moving
  from high-level intent to low-level detail (see `api/tests/acceptance/projects.test.ts`: the
  `it` blocks read first, the `postProjects` helper they call is defined last).
- **Result objects over thrown errors for expected failures**: any failure that's a normal,
  anticipated outcome of the operation — bad input, not found, already exists, server
  unreachable — is returned as a typed result, not thrown. Reserve `throw` for failures the
  code isn't designed to handle (bugs, startup misconfiguration).
- **No comments unless the implementation is non-trivial**: don't restate what the code already
  says; only comment a hidden constraint, invariant, or otherwise surprising behavior.
- **`undefined` over `null` for absence of value**: use `undefined` to represent "no value",
  except when the absence is something explicitly provided/chosen by the user (e.g. a form field
  the user left blank) — reserve `null` for that case.
- **Name a type used more than once**: don't repeat an inline object type/shape at more than one
  call site — declare it as a standalone `interface`, or a `type` built off another declaration
  (e.g. `Pick`/`Omit`) when that's a better fit, and reuse it.
- **Coarse-grained tests over fine-grained ones**: test at the command/route scope, decoupled
  from implementation details, rather than writing separate fine-grained unit tests for every
  internal helper. Drop to fine-grained, implementation-coupled tests only when the behavior is
  critical or complex enough to need them in isolation.
- **Don't inject dependencies that are never varied**: dependency injection is for testability or
  genuine alternate implementations — if a parameter is never swapped in practice, call the
  concrete implementation directly instead of injecting it. The testability exception only holds
  when there's no simpler test technique available: a plain output sink like `console.log`/
  `console.error` can be asserted on with `vi.spyOn` without adding a parameter at all, so prefer
  that over injecting a `logFn`/`errorFn`. Reserve injection for dependencies a spy can't reach
  (stdin prompts, the filesystem, network calls).
- **Given/when/then structure in tests**: separate a test's setup, the action under test, and its
  assertions with a blank line each, in that order — no need to label the sections, the blank
  lines are enough to make the structure legible.
