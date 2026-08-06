---
paths:
  - "cli/src/commands/**/*.ts"
---

# Commands stay free of process/logging/exit-code concerns

`src/commands/` holds orchestration logic only. A command doesn't read `process.argv`/
`process.env` or touch stdin/stdout, doesn't call `console.*` or any logger, and never maps its
result to an `exitCode` or calls `process.exit` — it returns a typed status/result, and
`src/index.ts`/`src/cli.ts` own environment access, printing, and the exit code.

```ts
// ❌
export async function init() {
  console.log('Initializing...')
  if (!process.env.SERVER_URL) process.exit(1)
}

// ✅
export async function init(options: InitOptions): Promise<InitResult> {
  if (!options.serverUrl) return { status: 'error', message: 'missing server URL' }
  return { status: 'success' }
}
```

**Why**: side-effecting inputs and outputs passed in as parameters (see `InitOptions` in
`src/commands/init.ts`) are what let tests inject fakes instead of touching the real filesystem,
env, or stdin. See `cli/STANDARDS.md` for the full architecture rationale.
