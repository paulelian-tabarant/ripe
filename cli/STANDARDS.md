# Coding Standards — `cli/`

Package-specific standards for `cli/`. These supplement the general rules in
[`../STANDARDS.md`](../STANDARDS.md) and the architecture notes in [`CLAUDE.md`](CLAUDE.md).

## Architecture

### Layering

- **Layer split**: `src/commands/` holds orchestration logic; `src/lib/` holds single-purpose
  helpers (HTTP calls, config file I/O). Don't mix the two — a command function should read as a
  sequence of calls into `lib/`, not inline `fs`/`fetch` logic.

### Command Boundaries

- **Dependency injection for testability, via required prompts/presenter objects**: side-effecting
  inputs (current working directory, interactive prompts) and outputs (user-facing messages) are
  passed in as **required** fields — no `options.x ?? defaultX` fallback inside a command. A
  command's questions to the user are grouped into a `*Prompts` interface (methods that return a
  value and drive control flow); everything the command used to tell the user directly is grouped
  into a `*Presenter` interface (one-way `void` notification methods, called at the point each
  fact is known). Reading the environment (e.g. the current directory) is exposed as a callable,
  not a pre-resolved value, since it's one of the command's own questions about its environment —
  same category as "what's the git remote."

  ```ts
  interface InitPrompts {
    promptForServerUrl(): Promise<string>
  }

  interface InitPresenter {
    onProjectRegistered(result: ProjectRegistrationResult): void
  }

  interface InitOptions {
    getCurrentDirectoryName: () => string // real implementation: () => process.cwd()
    prompts: InitPrompts
    presenter: InitPresenter
  }
  ```

  The one real implementation of each `*Prompts`/`*Presenter` interface is built in `src/cli.ts`,
  as command-specific wording over the generic `ask`/`logFn`/`errorFn`/`warnFn` primitives
  `src/index.ts` passes in — `src/cli.ts` itself never touches `readline`/`console`/`process.std*`
  directly. See `buildInitPrompts`/`buildInitPresenter`/`buildInitFn` in `src/cli.ts`.

- **Exit codes are not a command concern**: commands return a semantic success/error status, not
  an `exitCode`. Mapping that status to an `exitCode` and calling `process.exit` happens in
  `src/cli.ts`/`src/index.ts`, never inside a command.

  ```ts
  // src/commands/init.ts
  async function init(options: InitOptions): Promise<{ status: 'success' | 'error' }> { /* ... */ }

  // src/index.ts
  const result = await init(options)
  process.exit(result.status === 'success' ? 0 : 1)
  ```

- **Typed results over ad hoc shapes**: functions that call out to the network return a typed
  result object (e.g. `ProjectRegistrationResult`) rather than a bare `Response` or `unknown`.
- **No raw `console`/`process.std*`/`readline` access outside `src/index.ts`**: `src/index.ts` is
  the single composition root of the package and the only file allowed to touch `console.*`,
  `process.stdin`/`process.stdout`, or `node:readline` directly. Everywhere else — `src/cli.ts`
  and every command — relies exclusively on injected functions (`ask`/`logFn`/`errorFn`/`warnFn`
  in `src/cli.ts`; `prompts`/`presenter` in commands) for both asking and telling. This is a
  literal, greppable invariant:

  ```bash
  grep -rn 'console\.\|readline\|process\.std' cli/src/   # should only match src/index.ts
  ```

  ```ts
  // ❌ command (or cli.ts) touches the environment directly
  async function init(options: InitOptions) {
    console.log('Project registered')
  }

  // ✅ command calls an injected presenter method instead
  async function init(options: InitOptions) {
    options.presenter.onProjectRegistered(result)
  }
  ```

## Testing

General testing principles live in [`../STANDARDS.md`](../STANDARDS.md). This section covers
only the `cli/`-specific test layout.

- **Test split mirrors the layer split**: `tests/cli.test.ts` covers command routing — help
  flags, unknown-command handling, dispatch — with each command mocked (e.g. `initFn: vi.fn()`),
  never exercising real command logic. `tests/commands/<command>.test.ts` covers that command in
  isolation, running through every real layer underneath it (`lib/`, filesystem) except the
  network, which is intercepted with `nock`.

```mermaid
flowchart TD
    A[tests/cli.test.ts] -->|mocked command fns| B[Routing: help, unknown command, dispatch]
    C[tests/commands/init.test.ts] -->|real command + lib/ + filesystem| D[Command behavior]
    C -->|nock intercepts network only| E[HTTP boundary]
```
