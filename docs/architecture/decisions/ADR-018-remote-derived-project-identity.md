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
- `.ripe/config.json` (committed) is retired. All remaining local state — `project_id` cache,
  skill ID cache, `last_synced_sha` (for future rename detection), and `serverUrl` — is
  consolidated into a single gitignored `.ripe/cache.json`. Nothing under `.ripe/` is committed to
  git anymore. (No consent flag is stored — [US-2.2](../../spec/user-stories/2026-06-21-us-2.2-event-submission.md)
  prints a consent notice on every `ripe init` instead of gating on a stored flag.)

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
