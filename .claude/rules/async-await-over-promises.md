---
paths:
  - "**/*.ts"
  - "**/*.tsx"
---

# `async`/`await` over chained promises

Write asynchronous code with `async`/`await`; reserve `.then`/`.catch` chains for the rare case
`async`/`await` can't express.

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

**Exception**: combinators that feed straight into further chaining (e.g. `Promise.all(...).then(...)`)
are fine to leave as-is when rewriting through `async`/`await` would add more code than it removes.
