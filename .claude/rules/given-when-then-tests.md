---
paths:
  - "**/*.test.ts"
  - "**/*.test.tsx"
---

# Given/when/then structure in tests

Separate a test's setup, the action under test, and its assertions with a blank line each, in
that order — no need to label the sections, the blank lines are enough to make the structure
legible.

```ts
it('returns the trimmed name', () => {
  const user = buildUser({ name: '  Ada  ' })

  const result = getDisplayName(user)

  expect(result).toBe('Ada')
})
```

**Why**: the blank lines alone make the structure legible without adding `// given`/`// when`/
`// then` labels that would just repeat what the spacing already shows.
