# CLI `init` Dependency-Injection Refactor — Implementation Plan

**Goal:** Refactor `cli/src/commands/init.ts` and its callers so the command never touches
`console`/`process`/`stdin` directly — all interaction with the outside world (asking the user
something, telling the user something, reading environment state) flows through explicitly
injected dependencies, built for real in exactly one place (`cli.ts`), with `index.ts` reduced to
a thin composition root. This is a standalone cleanup against current `main` — **it does not
touch anything related to skill registration** (US-2.1), which depends on this refactor landing
first.

**Why now:** the existing `.claude/rules/cli/single-io-composition-root.md` rule (merged into `main`
after `feature/us-2.1-skill-registration` diverged) already documents most of this intent but the
current `init.ts` violates it directly (9 raw `console.*` calls). Untangling this was going to be
unavoidable once US-2.1 added several new warnings/errors to the same command — better to do it
once, cleanly, before that feature builds on top of the old shape.

## Design

### `commands/init.ts`

```ts
export interface InitPrompts {
  promptForServerUrl(): Promise<string>
  promptAnotherServerUrl(): Promise<string>
  promptToConfirmServerUrl(existingUrl: string): Promise<boolean>
  promptForHttpsRemote(remoteUrl: string): Promise<string>
}

export interface InitPresenter {
  onInvalidServerUrl(url: string): void
  onProjectRegistered(result: ProjectRegistrationResult): void
  onRemoteUrlError(detail?: string): void
  onServerRejectedRemoteUrl(remoteUrl: string, detail?: string): void
  onServerUnreachable(serverUrl: string, detail?: string): void
  onLocalStateWriteFailed(detail?: string): void
}

export interface InitOptions {
  getCurrentDirectoryName: () => string
  prompts: InitPrompts
  presenter: InitPresenter
}

export interface InitResult {
  status: 'success' | 'error'
}
```

- All three `InitOptions` fields are **required** — no `options.x ?? defaultX` fallback anywhere
  inside `init.ts`. Dependencies are always chosen by the caller, never defaulted internally.
- `init()` calls `prompts.*`/`presenter.*` directly at the point each fact is known — the same
  pattern already used for prompts today, now extended to cover what were previously direct
  `console.*` calls.
- `getCurrentDirectoryName` is a callable, not a resolved string: reading the current directory is
  one of `init`'s own questions about its environment (same category as "what's the git remote,"
  "what's the server URL"), so it's triggered from inside the command, not pre-resolved by the
  caller. Real implementation: `() => process.cwd()`. This matches `cli/STANDARDS.md`'s existing
  (previously unimplemented) documented shape — fix the code to match the doc, not the reverse.
- `onInvalidServerUrl` lives on `InitPresenter`, not `InitPrompts` — it's a one-way, void
  notification (same shape as every other presenter method), even though it happens mid-process
  between two prompt calls. The split between the two interfaces is by *call shape* (prompts
  return a value and drive control flow; presenter calls are one-way and don't), not by "does this
  happen at the very end."
- `promptAnotherServerUrl()` is distinct from `promptForServerUrl()` so the real implementation can
  phrase a retry differently from the first ask, instead of literally repeating the same question.
  The retry loop becomes:

  ```ts
  async function resolveServerUrl(prompts: InitPrompts, presenter: InitPresenter, ...): Promise<string> {
    let serverUrl = await prompts.promptForServerUrl()
    while (!isValidHttpUrl(serverUrl)) {
      presenter.onInvalidServerUrl(serverUrl)
      serverUrl = await prompts.promptAnotherServerUrl()
    }
    return serverUrl
  }
  ```

- `InitResult` collapses to `{ status: 'success' | 'error' }` — no `error`/`outcomes` field needed,
  since every fact that would have gone into one is now delivered via a presenter call at the
  point it's known.

### `cli.ts`

- Owns the one real `InitPrompts` implementation and the one real `InitPresenter`
  implementation — but built purely as command-specific *wording* over two generic primitives
  received from `index.ts`: `askFn: (question: string) => Promise<string>` (input) and
  `logFn`/`errorFn`/`warnFn` (output). `cli.ts` itself never touches `readline`/`process.stdin`/
  `process.stdout`/`console` directly — it only decides which question text maps to which prompt,
  and which message text maps to which presenter call, then delegates to the generic primitive.

  ```ts
  export function buildInitPrompts(askFn: (question: string) => Promise<string>): InitPrompts {
    return {
      promptForServerUrl: () => askFn('Server URL: '),
      promptAnotherServerUrl: () => askFn('Please enter another server URL: '),
      promptToConfirmServerUrl: (existingUrl) =>
        askFn(`Found existing server URL: "${existingUrl}". Keep it? (y/n) `).then(
          (a) => a.toLowerCase() === 'y',
        ),
      promptForHttpsRemote: (remoteUrl) =>
        askFn(`Your git remote ("${remoteUrl}") isn't HTTPS. Enter the HTTPS URL for this repo: `),
    }
  }
  ```

- Exports a pre-wired `initFn: () => init({ getCurrentDirectoryName: () => process.cwd(), prompts, presenter })`.
- `RunCliOptions`:

  ```ts
  interface RunCliOptions {
    logFn: (message: string) => void
    errorFn: (message: string) => void
    warnFn: (message: string) => void
    askFn: (question: string) => Promise<string>
    initFn: () => Promise<InitResult>
  }
  ```

  All fields are **required**, no `??` defaulting inside `runCli` either. Today's
  `options.logFn ?? console.log` / `options.errorFn ?? console.error` are the only two `console`
  references in `cli.ts` — removing the defaulting removes them entirely, and moving the
  `readline` mechanism out removes the last raw environment access too.
- `cli.ts` is the only place that knows `init` specifically needs prompts/a presenter — this is
  "the CLI's job to know each command's message details," not `index.ts`'s. It just no longer
  needs to touch the environment directly to do it.

### `index.ts`

- Becomes the single true composition root: builds the generic, command-agnostic raw I/O
  primitives — `logFn: console.log`, `errorFn: console.error`, `warnFn: console.warn` (output),
  and `ask` (input, wrapping `readline` — today's `ask()` helper, moved here unchanged) — and
  passes all five into `runCli`. It never knows what a specific command asks or tells, only how to
  perform a raw ask/tell in general.

```ts
import { createInterface } from 'node:readline/promises'
import { initFn, runCli } from './cli.js'

async function askFn(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  try {
    return await rl.question(question)
  } finally {
    rl.close()
  }
}

const { exitCode } = await runCli(process.argv.slice(2), {
  logFn: console.log,
  errorFn: console.error,
  warnFn: console.warn,
  askFn,
  initFn,
})
process.exit(exitCode)
```

### The precise, checkable form of the rule

Once this lands: **all raw `console`/`process`/`stdin`/`stdout` access — both output and input —
exists nowhere in `cli/src/` except `index.ts`.** Everywhere else is injected: `cli.ts`'s
prompt/presenter implementations call the injected `ask`/`logFn`/`errorFn`/`warnFn` rather than
touching the environment directly, and commands call the injected `presenter`/`prompts`. This is
a literal, greppable invariant: `grep -rn 'console\.\|readline\|process\.std' cli/src/` should
return only the lines in `index.ts`. Use this as the acceptance check for the refactor, and as the
wording basis for the rewritten `.claude/rules/cli/single-io-composition-root.md` (see below).

## Test impact

- `cli/tests/commands/init.test.ts` already tests `init()` directly, bypassing `cli.ts` — that
  stays true. Since `InitOptions` fields are now all required, add a small local factory in this
  file (e.g. `function fakeInitOptions(overrides: Partial<InitOptions> = {}): InitOptions`)
  supplying harmless/throw-if-unexpectedly-called fakes for `prompts`/`presenter`/
  `getCurrentDirectoryName`, with each test spreading only what it cares about — mirrors the
  production builder in `cli.ts`, just a fake one.
- Assertions shift from `expect(result).toEqual({status: 'error', ...})`-style checks to
  `expect(presenter.onServerUnreachable).toHaveBeenCalledWith(...)`-style checks for
  presenter-driven cases — this is the accepted trade-off of the injected-presenter approach
  (flexibility for mid-process notifications) over a single final result value.
- `cli/tests/cli.test.ts` needs the same treatment for `RunCliOptions`. Verified against the
  current file: today's tests already rely on partial defaulting (e.g.
  `runCli(argv, { logFn, initFn })` omits `errorFn`/`warnFn`, `runCli(argv, { errorFn, initFn })`
  omits `logFn`/`warnFn`) — once all five fields (`logFn`/`errorFn`/`warnFn`/`ask`/`init`) are
  required, every call site needs all of them, not just the one under test. Add a local
  fake-`RunCliOptions` builder here too, same pattern as `init.test.ts`.

## Documentation & CLAUDE-context updates (do this *after* the code changes, as an explicit final step)

- `cli/CLAUDE.md` — update the Architecture section to describe the `InitPrompts`/`InitPresenter`/
  `getCurrentDirectoryName` pattern, `cli.ts` as the command-specific wording layer over generic
  `ask`/`logFn`/`errorFn`/`warnFn` primitives, `index.ts` as the single composition root owning
  every raw environment access (both output and input) in the package.
- `cli/STANDARDS.md` — replace the stale single-`logFn`-parameter example (which described an
  injected-logger pattern that was never actually implemented and is now explicitly superseded)
  with the prompts/presenter pattern above.
- `.claude/rules/cli/single-io-composition-root.md` — rewrite using the precise form above: raw
  `console`/`process`/`stdin`/`stdout` access exists only in `index.ts`; everywhere else, injected
  functions (`ask`/`logFn`/`errorFn`/`warnFn` in `cli.ts`; `prompts`/`presenter` in commands)
  are the sanctioned mechanism for both asking and telling. The old wording ("doesn't call
  `console.*` or any logger") was already inconsistent with the accepted prompt-injection pattern
  before this refactor; this makes the rule match reality and gives it a literally greppable
  acceptance check.

## Open question left for this session to resolve

Whether to generalize the prompts/presenter (bundled-object) pattern as the standard for any
*future* CLI command, versus adopting class-based constructor DI (mirroring the `api/` package's
style) if the CLI grows past one command. Not blocking for this refactor — `init` is still the
only command — but worth an explicit decision recorded somewhere (this doc's own follow-up, or a
new ADR) once a second command exists.

## Explicitly out of scope

- Anything related to skill registration (US-2.1) — no `scanSkills`/`registerSkills`/
  `syncSkillCatalog`/cache changes here. That work resumes on `feature/us-2.1-skill-registration`
  **after** this lands on `main` and the feature branch is rebased onto it, extending
  `InitPrompts`/`InitPresenter` with the new skill-registration-specific methods rather than
  reintroducing direct `console.*` calls.
- The invalid-server-URL retry loop's *wording* — only its structure (`promptAnotherServerUrl` vs
  `promptForServerUrl`) is prescribed here; actual copy is an implementation detail.
