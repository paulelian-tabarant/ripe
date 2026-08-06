---
paths:
  - "**/*.ts"
  - "**/*.tsx"
---

# Result objects over thrown errors for expected failures

Any failure that's a normal, anticipated outcome of the operation — bad input, not found,
already exists, server unreachable — is returned as a typed result, not thrown. Reserve `throw`
for failures the code isn't designed to handle (bugs, startup misconfiguration).

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

**Rule**: if a caller is expected to handle the failure as one of the normal outcomes of calling
this function, type it into the return value; reserve `throw` for what a caller has no reasonable
way to plan for. See `STANDARDS.md` for the full rationale and the follow-on convention for
naming a failure branch alongside its success shape.
