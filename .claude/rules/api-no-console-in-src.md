---
paths:
  - "api/src/**/*.ts"
---

# No `console.*` in `api/src/`

Application code communicates via Fastify's request/reply and return values, not console
output — logging belongs to Fastify's own logger, not ad hoc `console` calls.

```ts
// ❌
console.log('registering project', name)

// ✅
request.log.info({ name }, 'registering project')
```
