# ADR-018: Remote-Derived Project Identity

**Status**: Accepted — supersedes [ADR-016](ADR-016-config-cache-separation.md), [ADR-017](ADR-017-unique-project-names.md)
**Date**: 2026-07-25
**Deciders**: Paul-Elian Tabarant

## Context

ADR-017 keyed project uniqueness on the directory `name`, which is ambiguous: two unrelated
repositories can share a directory name, so the server cannot tell "this is the same project"
from "this is a name collision" and must ask the user to confirm on every conflict.

ADR-016 solved a related problem — team members needing to share the same `project_id` — by
committing `.ripe/config.json` to git. This works, but only for teams that remember to commit it,
and it ties project identity to a piece of local file state that has to be created, shared, and
kept in sync.

Ripe is scoped to shared (remote-backed) projects only — a project without a git remote isn't a
target for team telemetry in the first place.

## Decision

- Project identity is derived from the **canonicalized `origin` remote URL**, not the directory
  name:
  - `git@github.com:org/repo.git`, `ssh://git@github.com/org/repo.git`, and
    `https://github.com/org/repo.git` all normalize to `github.com/org/repo`
  - No `origin` remote configured → hard error (`ripe requires a git remote — this project isn't
    shared`); no fallback to directory name
  - Only `origin` is considered; multiple remotes (`upstream`, etc.) are not consulted
- The `projects` table gets a new `UNIQUE` column, `repo_key`, holding the canonicalized string.
  The existing `name` column becomes a purely cosmetic **display name** (directory basename at
  `init` time), no longer unique.
- `POST /api/projects` becomes find-or-create on `repo_key`, mirroring the skill registration
  pattern (`ON CONFLICT DO NOTHING`, same input always returns the same result). The 409 +
  confirmation-prompt flow from ADR-017 is removed — there is no longer a case where the CLI needs
  to ask "is this really the same project?", because `repo_key` collisions only occur when it
  genuinely is the same repository.
- The server-assigned `id` (`proj_<nanoid>` format) is unchanged and stays the value used in URL
  paths (e.g. `GET /api/projects/{project_id}/activity`). `repo_key` is not used in URLs — this
  avoids needing to slugify or hash a value containing `/` and `.` for path-safety.
- `project_id` **may still be cached locally as an optimization** (avoids a resolve call on every
  `sync`), but the cache is never load-bearing and never committed. Because `repo_key` is
  deterministic (recomputed from `git remote get-url origin`) and lookup is idempotent
  server-side, a missing or stale cache entry just means the next call re-resolves `project_id`
  from the server — no ambiguity, no risk of duplicate or misattached data. This removes the
  problem ADR-016 was solving — there is no longer anything that needs to be committed to git for
  team members to share, because every team member's local git remote already produces the same
  `repo_key`, and the server resolves it to the same `project_id` regardless of whether any given
  machine has it cached.
- `.ripe/config.json` (committed) is retired. Remaining local state splits into two gitignored
  files: `.ripe/settings.json`, holding only the interactively-configured `serverUrl`; and
  `.ripe/cache.json`, holding everything server-resolved or derived — `project_id` cache, skill ID
  cache, and `last_synced_sha` (for future rename detection). The split matters for recovery: a
  stale/rejected entry in `.ripe/cache.json` can always be fixed by deleting that file alone,
  without disturbing `serverUrl` or forcing a re-prompt. Nothing under `.ripe/` is committed to
  git anymore. (No consent flag is stored — [US-2.2](../../spec/user-stories/2026-06-21-us-2.2-event-submission.md)
  prints a consent notice on every `ripe init` instead of gating on a stored flag.)
- **v1 does not automatically recover** from the server rejecting a cached `project_id`/`skill_id`
  as unknown (requires server-side existence validation on `POST /api/skills`/`POST /api/events`).
  `sync` fails, records the issue in the local outcome file, and surfaces on the next `ripe`
  invocation with the fix: delete `.ripe/cache.json`, run `ripe sync` again. This is a manual
  stand-in for the same resolve-or-create calls a later slice can trigger automatically on
  rejection instead of by hand.

**Explicitly out of scope for this decision:**

- **Forks**: a fork has a different `origin` remote, so it naturally registers as a separate
  project. No fork-detection or telemetry-merging logic is planned.
- **Repository renames/moves**: changing the `origin` remote URL is indistinguishable from
  registering a new project under this model — history under the old `repo_key` is orphaned. This
  is the same accepted limitation as V1 skill renames (see
  [version-2-scope.md](../../spec/versions/version-2-scope.md)); revisit later using a similar
  git-diff-based technique if it becomes a real pain point.
- **Duplicate display names**: `name` (directory basename) is no longer unique, so two unrelated
  repos sharing a basename render identically in the [US-1.2](../../spec/user-stories/2026-06-21-us-1.2-project-listing.md)
  dropdown, with no `repo_key`/org disambiguator shown. Accepted for now — revisit only if this
  causes an actual user-reported mix-up.

## Related, Deferred Decision: `remote_url` for Connectivity

`repo_key` is an **identity key only** — it exists so the server can answer "is this the same
project," and it is deliberately lossy in ways that don't matter for that purpose (see the
casing/canonicalization trade-offs under Risks below). It is not, and should not be treated as, a
connectable address.

This matters because a future capability — server-side fetching of repo state from the git host,
for [skill rename/delete reconciliation](../../spec/versions/version-2-scope.md) — needs the
opposite property: a literal, reachable host. `repo_key` fails that job. `git-url-parse`'s `source`
field (used to build `repo_key`) applies its own heuristic to guess a "provider name," stripping
subdomains it assumes are vcs-hosting prefixes — e.g. `gitlab-forge.example.gouv.fr` normalizes to
`example.gouv.fr`, which is not the actual git host. The library's `resource` field holds the
unmangled literal hostname and is what any future connectivity use case must use instead.

The forward-looking plan (not implemented by this ADR): also persist the raw `remoteUrl` already
received on every `POST /api/projects` call (currently discarded after being reduced to
`repo_key`), as a separate nullable column. `repo_key` remains the sole identity lookup, indexed
and `UNIQUE`; `remote_url` would carry no uniqueness constraint and is never used for project
resolution — only as the source for deriving a connectable host (via `resource`, not `source`) when
that capability is built.

## Rationale

- ✅ `repo_key` collisions are impossible for unrelated projects (in practice), removing the
  ambiguity that forced ADR-017's confirmation prompt
- ✅ No local file needs to be committed or shared for the whole team to converge on the same
  project — the git remote itself is the shared, ambient source of truth
- ✅ Keeps the existing, already-shipped `proj_<nanoid>` ID format and URL shape unchanged
- ✅ Consistent with the skill registration model (ADR-012): server is idempotent source of truth,
  client caches are pure optimizations, never load-bearing for correctness

## Alternatives Considered

- **Keep ADR-017's name + prompt model** — ambiguity and manual confirmation remain permanently;
  ruled out now that a deterministic, collision-resistant key is available.
- **Use a hash of `repo_key` as the server-assigned `id`** — would make `project_id` deterministic
  and client-computable without a server round-trip, but requires reformatting the already-shipped
  ID format and introduces path-safety/collision considerations for no real benefit here (the
  client already needs network access for `init`/`sync` regardless); ruled out in favor of keeping
  `repo_key` as a separate column.
- **Keep committing `.ripe/config.json`** (ADR-016's model) — still works, but is now strictly more
  moving parts than necessary once `repo_key` makes the ID recomputable without git sharing; ruled
  out.

## Consequences

**Positive**:

- ✅ No more 409/confirmation UX for the common case — `init` just works, silently idempotent
- ✅ No local file needs to be committed, reviewed, or merge-conflict-managed for project identity
- ✅ Team members converge on the same project automatically, with zero coordination

**Risks/Trade-offs**:

- ⚠️ Projects without a configured `origin` remote cannot use `ripe` at all — acceptable, matches
  the product's shared-project scope
- ⚠️ Renaming/moving a repository's remote silently starts a new project, orphaning prior history —
  accepted, same shape as the existing V1 skill-rename limitation
- ⚠️ Two unrelated self-hosted git servers reusing the same host/org/repo path (unlikely, but
  possible with internal Git servers) would collide — accepted as a rare edge case
- ⚠️ Normalization doesn't lowercase the host consistently across remote forms (the
  `git-url-parse` library used server-side lowercases it for `https://`/`ssh://` via WHATWG
  `URL`, but not for scp-like SSH, whose host parsing goes through a custom regex) and never
  lowercases the org/repo path at all (a deliberate choice — that's a server-side identifier that
  may be case-sensitive on some self-hosted git servers). Two developers whose `origin` remotes
  differ only in host casing across those two shapes would silently register a second project —
  accepted as the same shape of rare, silent edge case as the above, given every major git host's
  UI always emits lowercase clone URLs in practice
