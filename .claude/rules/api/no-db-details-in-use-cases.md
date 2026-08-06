---
paths:
  - "api/src/use-cases/**/*.ts"
---

# No DB details leaking into use-cases

Repository functions return domain-shaped objects — a use-case never references raw table/column
names or row shapes.

```ts
// ❌ use-case reads the repository's raw row shape
const row = repo.findRow(id) // { proj_id, proj_name, created_at }
if (row.proj_name === name) { ... }

// ✅ repository translates to a domain shape before returning
const project = repo.getById(id) // Project { id, name }
if (project.name === name) { ... }
```

**Rule**: if a use-case needs to know a column name to read a value, that translation belongs in
the repository, not the use-case. See `api/STANDARDS.md` for the full architecture rationale.
