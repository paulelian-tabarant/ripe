---
paths:
  - "**/*.test.ts"
  - "**/*.test.tsx"
---

# Parameterize near-identical test cases with `it.each`

When two or more `it()`/`test()` blocks in the same `describe` run the same arrange-act-assert
sequence and differ only in an input value (or a small set of input values) and the expected
outcome, collapse them into a single `it.each`/`test.each` call instead of writing them out
separately.

**Why**: separately-written cases like this hide the fact that they're really one behavior with
several inputs — reading them as N tests instead of "1 behavior × N inputs" costs more attention
than the variation is worth, and adding a new case means copy-pasting a whole block instead of
adding one row.

**How to apply**:

- Look for titles that read as small variations of each other (different casing, different
  malformed-input shapes, different flag combinations) with the same shape of assertion
  afterward.
- Extract the varying pieces into a data table — `[description, input, expected]` tuples (or
  similar) — passed to `it.each([...])`, keeping the description as the first field so it renders
  in the test name via `%s`/`%j` in the title template.
- Don't force it: if the cases need materially different setup (different mocks/spies wired per
  case, not just different data), a shared data row can't express that — leave them as separate
  `it()` blocks, or extract a shared preparation helper instead (see `STANDARDS.md`).
- See `cli/tests/commands/init.test.ts` (`re-registers when .ripe/config.json %s`),
  `api/tests/config.test.ts` (`throws when %s`), and `api/tests/endpoints/postProjects.test.ts`
  (`returns 400 for %s`) for the pattern already applied in this repo.

```ts
// Before — same arrange-act-assert, only the input/expectation differs
it('rejects an empty name', () => {
  expect(validate('').valid).toBe(false)
})
it('rejects a name over 100 chars', () => {
  expect(validate('a'.repeat(101)).valid).toBe(false)
})

// After — one behavior, N inputs
it.each([
  ['an empty name', ''],
  ['a name over 100 chars', 'a'.repeat(101)],
])('rejects %s', (_description, name) => {
  expect(validate(name).valid).toBe(false)
})
```
