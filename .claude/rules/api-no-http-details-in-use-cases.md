---
paths:
  - "api/src/use-cases/**/*.ts"
---

# No HTTP details leaking into use-cases

Use-cases don't reference HTTP concepts (status codes, request/response shapes, headers) — that
mapping belongs to endpoints.

```ts
// ❌
class RegisterProject {
  run(name: string) {
    if (exists) return { statusCode: 409 }
  }
}

// ✅
class RegisterProject {
  run(name: string): RegisterProjectResult {
    if (exists) return { created: false, projectId: existing.id }
  }
}
```

**Rule**: a use-case returns a typed, HTTP-agnostic result; the endpoint alone decides which
status code represents that result. See `api/STANDARDS.md` for the full architecture rationale.
