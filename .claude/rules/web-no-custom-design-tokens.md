---
paths:
  - "web/src/**/*.tsx"
---

# No custom design tokens

Use Tailwind's default scale (`gap-2`, `text-sm`, `zinc-900`, …), not arbitrary values
(`mt-[13px]`, hex literals). Encapsulate color/variant choices inside shared components instead
of repeating raw classes at each call site.

```tsx
// ❌ arbitrary value, repeated per call site
<div className="mt-[13px] text-[#3f3f46]">...</div>

// ✅ default scale, encapsulated in a shared component
<Message variant="muted">...</Message>
```

**Rule**: if you're reaching for a bracketed arbitrary value or a hex literal, that's a sign the
choice belongs in a shared component's variant, not at the call site. See `web/STANDARDS.md` for
the full styling conventions.
