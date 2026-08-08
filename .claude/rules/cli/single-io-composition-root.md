---
paths:
  - "cli/src/commands/**/*.ts"
  - "cli/src/cli.ts"
---

# No raw console/readline/process.std\* access outside `src/index.ts`

`src/index.ts` is the single composition root of the `cli/` package — the only file allowed to
call `console.*`, touch `process.stdin`/`process.stdout`, or use `node:readline` directly.
Everywhere else, both asking the user something and telling the user something go through
injected functions, never the environment directly:

- `src/cli.ts` never touches `console`/`readline`/`process.std*` itself. It only maps command-
  specific wording to the generic `ask`/`logFn`/`errorFn`/`warnFn` primitives it receives from
  `src/index.ts` (see `buildInitPrompter`/`buildInitPresenter` in `src/cli.ts`).
- `src/commands/` holds orchestration logic only. A command doesn't read `process.argv`/
  `process.env`, touch stdin/stdout, or call `console.*`/`readline` — it calls its injected
  `prompts`/`presenter` methods instead, and never maps its result to an `exitCode` or calls
  `process.exit`. It returns a typed status/result; `src/cli.ts`/`src/index.ts` own the exit code.

This is a literal, greppable invariant — the check for this refactor and every command added
after it:

```bash
grep -rn 'console\.\|readline\|process\.std' cli/src/   # should only match src/index.ts
```

```ts
// ❌ command touches the environment directly
export async function init() {
  console.log('Initializing...')
  if (!process.env.SERVER_URL) process.exit(1)
}

// ✅ command calls its injected prompts/presenter instead
export async function init(options: InitOptions): Promise<InitResult> {
  if (!options.serverUrl) {
    options.presenter.onInvalidServerUrl(options.serverUrl)
    return { status: 'error' }
  }
  return { status: 'success' }
}
```

**Why**: side-effecting inputs and outputs passed in as injected functions (see
`InitPrompter`/`InitPresenter` in `src/commands/init.ts`, and `RunCliOptions` in `src/cli.ts`) are
what let tests inject fakes instead of touching the real filesystem, env, or stdin — and what
keeps every raw environment access auditable from a single file. See `cli/STANDARDS.md` for the
full architecture rationale.
