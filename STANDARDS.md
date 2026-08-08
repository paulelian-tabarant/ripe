# Coding Standards

This file documents general coding standards for this repository: style and structure rules a
contributor should follow when writing new code. It supplements — it does not replace — the
package-level `CLAUDE.md` files (root, `cli/CLAUDE.md`, `api/CLAUDE.md`), which describe
architecture, commands, and project-specific conventions in more depth.

Package-specific standards live alongside each package:

- [`cli/STANDARDS.md`](cli/STANDARDS.md)
- [`api/STANDARDS.md`](api/STANDARDS.md)
- [`web/STANDARDS.md`](web/STANDARDS.md)

## General

These rules apply across the whole workspace (`api/`, `cli/`, and `web/`), which share the root
`biome.json` and `tsconfig.base.json`.

### Types & Data

- **TypeScript strictness**: `strict: true` is enabled at the base and inherited by both
  packages. Don't weaken it locally (no `any` escape hatches, no `@ts-ignore`).
- **`undefined` over `null` for absence of value**: use `undefined` to represent "no value",
  except when the absence is something explicitly provided/chosen by the user (e.g. a form field
  the user left blank) — reserve `null` for that case.
- **Name a type used more than once**: don't repeat an inline object type/shape at more than one
  call site — declare it as a standalone `interface`, or a `type` built off another declaration
  (e.g. `Pick`/`Omit`) when that's a better fit, and reuse it.

  ```ts
  // ❌ the same shape repeated at each call site
  function render(user: { id: string; name: string }) { ... }
  function log(user: { id: string; name: string }) { ... }

  // ✅ named once, reused
  interface User { id: string; name: string }
  function render(user: User) { ... }
  function log(user: User) { ... }
  ```

- **Result objects over thrown errors for expected failures**: any failure that's a normal,
  anticipated outcome of the operation — bad input, not found, already exists, server
  unreachable — is returned as a typed result, not thrown. Reserve `throw` for failures the
  code isn't designed to handle (bugs, startup misconfiguration).

  ```ts
  // ❌ an anticipated outcome (not found) treated as exceptional
  function getProject(id: string): Project {
    const project = repo.find(id)
    if (!project) throw new Error('not found')
    return project
  }

  // ✅ the same outcome typed as part of the normal result
  function getProject(id: string): Project | ProjectNotFoundError {
    return repo.find(id) ?? new ProjectNotFoundError(id)
  }
  ```

- **Typing an expected failure alongside its success shape**: when a function's result has a
  failure branch worth naming, model it as a union of the success shape and a named class
  extending `Error`, narrowed via `instanceof`.

  ```ts
  type RegisterProjectResult =
    | { created: boolean; projectId: string }
    | InvalidRemoteUrlError
  ```

  - The class is returned as a plain value, never thrown — its shape is chosen for
    `.message`/`instanceof` ergonomics, not as a signal to `throw`/`catch`, so don't let the
    `Error` suffix imply exception-style control flow at the call site.
  - Reserve this named-class shape for a failure branch that's more than a single boolean flag,
    or one that carries data (e.g. the invalid input itself). A bare boolean/literal flag (e.g.
    `{ invalid: true }`) is enough for a failure that carries no data worth naming and will never
    need to distinguish more than one reason — reach for the named-class shape as soon as either
    of those stops being true.
- **Shared API contract types live in `api`, not duplicated per client**: request/response wire
  shapes for `api` endpoints are declared once, in `api/src/endpoints/contracts/<domain>.ts` (types only —
  no Fastify, DB, or other runtime imports), and exposed to `cli`/`web` via a dedicated `exports`
  subpath in `api/package.json` (`./contracts/*.js`).
  - Response bodies get their own dedicated interface, not a reuse of the internal use-case/domain
    result type — the wire shape and the internal shape are allowed to diverge.
  - Consumers add `"@ripe/api": "workspace:*"` and import with `import type { ... } from
    '@ripe/api/contracts/<domain>.js'` (type-only, so bundlers elide it at build time) — never
    redeclare the same shape locally.

### Simplicity & Duplication

- **No unused exports**: keep modules' public surface limited to what's actually consumed;
  Biome's recommended rule set flags unused variables/imports — treat unused exports the same
  way during review.
- **No duplicated code, in tests or implementation**: extract a shared helper instead of
  repeating the same block across test cases or across a command and its lib (e.g.
  `readWrittenConfig()` in `cli/tests/commands/init.test.ts` — one helper reads and casts
  `.ripe/config.json` instead of every test doing its own `JSON.parse(readFileSync(...))`).
  - When several `it()` blocks repeat a whole arrange-and-act sequence and only the fixture and
    expectation vary, don't stop at deduping the smallest repeated statement inside them —
    collapse them into a single `it.each`/`test.each` instead of a separate `it()` per case. See
    [`.claude/rules/parameterize-similar-tests.md`](.claude/rules/parameterize-similar-tests.md)
    for the pattern and its threshold for stepping back to a shared preparation helper instead.
- **KISS**: pick the simplest implementation that makes the code work; don't add abstraction or
  generality the task doesn't need.

### Code Style

- **`async`/`await` over chained promises**: write asynchronous code with `async`/`await`; reserve
  `.then`/`.catch` chains for the rare case `async`/`await` can't express (e.g. `Promise.all`
  combinators feeding straight into further chaining).

  ```ts
  // ❌
  function loadProject(id: string) {
    return repo.findById(id).then((project) => project ?? null)
  }

  // ✅
  async function loadProject(id: string) {
    const project = await repo.findById(id)
    return project ?? null
  }
  ```

- **Early returns over nested conditionals**: guard against the exceptional/short-circuit case
  first and return, instead of wrapping the main logic in an `if`. Prefer flat, sequential code
  over deep nesting.

  ```ts
  // ❌ main logic nested inside the happy-path check
  function getDisplayName(user: User | undefined) {
    if (user) {
      return user.name.trim()
    } else {
      return 'Anonymous'
    }
  }

  // ✅ guard first, then flat logic
  function getDisplayName(user: User | undefined) {
    if (!user) return 'Anonymous'

    return user.name.trim()
  }
  ```

- **Blank line before a trailing `return`**: when a function/block ends with `return` after one or
  more preceding statements, separate it with a blank line so the "what's being returned" reads
  as its own step. Biome has no rule to enforce this — it's a manual convention, not lint-checked.

  ```ts
  function getDisplayName(user: User) {
    const trimmed = user.name.trim()

    return trimmed.length > 0 ? trimmed : 'Anonymous'
  }
  ```

- **`T[]` over `Array<T>`**: use the list-literal form for collection types; reserve `Array<T>` for
  the rare case the literal form can't express (e.g. `ReadonlyArray<T>`).
- **Step-down rule**: order code so callers appear before what they call, top to bottom, moving
  from high-level intent to low-level detail (see `api/tests/endpoints/project.endpoints.test.ts`:
  the `it` blocks read first, the `postProjects` helper they call is defined last).
- **No comments unless the implementation is non-trivial**: don't restate what the code already
  says; only comment a hidden constraint, invariant, or otherwise surprising behavior.

  ```ts
  // ❌ restates the code
  // increment the counter by 1
  counter += 1

  // ✅ explains a non-obvious constraint
  // Retried once: the upstream API occasionally 500s on cold start.
  const response = await fetchWithRetry(url, { retries: 1 })
  ```

### Testing

- **Testing philosophy**: prefer real dependencies over mocks wherever the codebase already does
  (e.g. an in-memory SQLite database, a real temp directory, `nock` for HTTP boundary
  interception rather than mocking internal modules). Reach for a mock only when there's no
  practical way to exercise the real dependency in a unit test.
- **Coarse-grained tests over fine-grained ones**: test at the command/route scope, decoupled
  from implementation details, rather than writing separate fine-grained unit tests for every
  internal helper.
  - Drop to fine-grained, implementation-coupled tests only when the behavior is critical or
    complex enough to need them in isolation — concretely, when a helper has enough input
    combinations that covering them all through the full stack (real DB, real filesystem,
    `fastify.inject()`, etc.) would meaningfully slow the suite down.
  - A handful of cases (e.g. two or three) doesn't meet that bar — route them through the
    existing coarse-grained test instead; the isolation only pays for itself once the combination
    count is large enough that per-case setup/teardown cost actually adds up.
- **Favor injection for dependencies that need to be varied**: whether for testing purposes
  (swapping in a fake) or other purposes (a genuine alternate implementation), if a dependency
  needs to vary, inject it — including output sinks like `logFn`/`errorFn`, even though
  `vi.spyOn` could reach `console.log`/`console.error` directly without adding a parameter.
  Don't inject a parameter that's never actually swapped in practice; call the concrete
  implementation directly instead.
- **Given/when/then structure in tests**: separate a test's setup, the action under test, and its
  assertions with a blank line each, in that order — no need to label the sections, the blank
  lines are enough to make the structure legible.

  ```ts
  it('returns the trimmed name', () => {
    const user = buildUser({ name: '  Ada  ' })

    const result = getDisplayName(user)

    expect(result).toBe('Ada')
  })
  ```

- **Write and name tests around observable behavior**: "behavioral" in this repo means observable
  through the real entry point — an HTTP response, CLI output/exit code, files written, rendered
  UI — as opposed to an internal implementation detail (schema shape, an internal constraint
  checked in isolation, a specific function/parameter having been invoked) that isn't itself
  observable. This applies to both what a test exercises/asserts on and what its title says —
  a title naming an internal detail leaks implementation into the test just as much as an
  assertion on one would:
  - **Assertions**: prefer tests that exercise and assert on observable behavior over an internal
    implementation detail. If a behavioral test already forces the detail to hold — e.g. a DB
    `UNIQUE` constraint proven by two requests for the same key resolving to the same result, and
    two requests for different keys both succeeding — don't add a separate test asserting the
    detail directly; it's redundant with what the behavior already proves. Reserve a direct
    implementation-detail assertion for a detail that's a documented contract but genuinely
    unobservable through the entry point (e.g. reading back an internal DB column's exact
    normalized value when nothing in the API response exposes it).
  - **Names**: name a test after the observable behavior it verifies — the user-facing outcome,
    output, exit code, or files written — not an internal function, parameter, or other
    implementation detail used to produce it. A reader (or a future refactor) shouldn't need to
    know an implementation's internals to understand what the test is pinning down; if the
    internal name changes but the behavior doesn't, the title shouldn't need to change either.
    E.g. prefer `'never asks the user to reuse an existing server URL when no .ripe/settings.json
    exists yet'` over `'never calls confirmServerUrlPromptFn when no .ripe/settings.json exists
    yet'` (see `cli/tests/commands/init.test.ts`).

Package-specific testing strategy (directory layout, what's unit vs. integration) lives in each
package's own `STANDARDS.md`.
