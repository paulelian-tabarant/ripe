# Coding Standards — `api/`

Package-specific standards for `api/`. These supplement the general rules in
[`../STANDARDS.md`](../STANDARDS.md) and the architecture notes in [`CLAUDE.md`](CLAUDE.md).

- **Three-layer split**: routes → services → repositories. Routes validate the request shape
  (JSON Schema) and translate results to HTTP status codes; services hold business logic;
  repositories hold raw SQL only. Don't skip a layer (no SQL in routes, no HTTP concerns in
  services).
- **Expected outcomes as typed results**: outcomes like "project already exists" are typed
  return values (e.g. `RegisterProjectResult`), which routes map to status codes (see the
  general result-objects-over-throwing rule in [`../STANDARDS.md`](../STANDARDS.md);
  `loadConfig()` throwing on missing env vars is the kind of startup condition that's genuinely
  exceptional instead).
- **No `console.*` in `src/`**: application code communicates via Fastify's request/reply and
  return values, not console output; logging belongs to Fastify's own logger, not ad hoc
  `console` calls.
- **Migrations**: schema changes go in `src/db/migrations.ts` as versioned entries with `up`/
  `down` SQL, applied via `migrateDatabase(db)`. Never hand-edit the schema outside a migration.
- **No DB details leaking into services**: repositories don't leak row shapes or column naming
  into the service layer — repository functions return domain-shaped objects, so services never
  reference raw table/column names.
- **No HTTP details leaking into services**: services don't reference HTTP concepts (status
  codes, request/response shapes, headers) — that mapping belongs to routes.
