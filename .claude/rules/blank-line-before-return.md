---
paths:
  - "**/*.ts"
  - "**/*.tsx"
---

# Blank line before a trailing `return`

When a function/block ends with `return` after one or more preceding statements, separate it
with a blank line so "what's being returned" reads as its own step.

```ts
// Before
function getDisplayName(user: User) {
  const trimmed = user.name.trim()
  return trimmed.length > 0 ? trimmed : 'Anonymous'
}

// After
function getDisplayName(user: User) {
  const trimmed = user.name.trim()

  return trimmed.length > 0 ? trimmed : 'Anonymous'
}
```

**Not lint-checked** — Biome has no rule for this, so it's on the author to apply it by hand. See
`STANDARDS.md`'s "Structure & Simplicity" section for the full list of manual-convention rules.
