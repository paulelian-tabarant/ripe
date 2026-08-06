---
paths:
  - "**/*.ts"
  - "**/*.tsx"
---

# No comments unless the implementation is non-trivial

Don't restate what the code already says. Only comment a hidden constraint, invariant, or
otherwise surprising behavior.

```ts
// ❌ restates the code
// increment the counter by 1
counter += 1

// ✅ explains a non-obvious constraint
// Retried once: the upstream API occasionally 500s on cold start.
const response = await fetchWithRetry(url, { retries: 1 })
```

**Why**: a comment that just narrates the next line adds reading cost without adding
information — and goes stale exactly like a bad test title would (see
`.claude/rules/behavioral-tests.md`).
