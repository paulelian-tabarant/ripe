# ADR-019: Repository State Synchronization

**Status**: Accepted
**Date**: 2026-08-02
**Deciders**: Paul-Elian Tabarant

## Context

[ADR-018](ADR-018-remote-derived-project-identity.md) derives project identity from a project's
git `origin` remote via `repo_key`, but flags `repo_key` as unsuitable for anything beyond
identity: it's deliberately lossy (case-insensitive host matching, a provider-name heuristic that
strips subdomains it guesses are vcs-hosting prefixes) in ways that are fine for "is this the same
project" but wrong for "what address do I connect to."

A future capability needs the opposite property — a literal, reachable host: server-side fetching
of repo state from the git host, to detect skill renames (as opposed to delete+add) via git's own
rename detection rather than diffing local cache state (see
[version 2 scope](../../spec/versions/version-2-scope.md)). That capability, and others like it
(any server-initiated read of a project's actual repository), is this ADR's subject —
collectively, "repository state synchronization."

This ADR was triggered by [US-1.3](../../spec/user-stories/2026-07-25-us-1.3-remote-derived-project-identity.md)
implementing the first concrete piece of it: persisting a connectable `remote_url` alongside
`repo_key`, and restricting registration to `https://` remotes.

## Decision

1. **Persist `remote_url` as a separate, non-identity column** — `https://{resource}/{owner}/{name}`,
   derived from `git-url-parse`'s `resource` field (the literal, unmangled hostname), never
   `source` (the field `repo_key` uses, which can mangle real hosts — e.g. a self-hosted GitLab at
   `gitlab-forge.example.gouv.fr` gets `source`-normalized to `example.gouv.fr`, dropping the
   `gitlab-forge.` prefix and producing an address that doesn't resolve to the same host).
   `repo_key` remains the sole identity lookup; `remote_url` is never used for project resolution,
   isn't exposed on the wire, and is computed once at registration, never refreshed.
2. **Only `https://` `origin` remotes can register a project at all** — any other protocol
   (`ssh://`, scp-like, `git://`) is rejected outright with `400`, the same contract as an
   unparseable remote. The CLI softens this for end users by prompting for the HTTPS equivalent
   when the local `origin` isn't already `https://`, one-shot with no client-side re-validation
   (see US-1.3's "CLI Behavior").
3. **Any future repository-state synchronization capability is built on `remote_url`, and assumes
   `https://` access** — not raw SSH. This ADR does not implement that capability (fetching,
   webhooks, host APIs); it only commits to the address format and protocol constraint it will be
   built on, so that projects registered today don't have an unbackfillable identity gap once it
   lands.

## Rationale

- **Correctness**: deriving a *correct* `https://` form from a non-`https://` remote isn't
  reliable in every case. The same self-hosted GitLab instance above exposes SSH on a dedicated
  `ssh.*`-prefixed subdomain distinct from its actual HTTPS/web host — naively rebuilding an HTTPS
  URL from that remote's parsed SSH host produces an address that fails to connect at all
  (confirmed empirically). Rather than guess, non-`https://` remotes are rejected until a git
  host's actual HTTPS address can be obtained some other way (today: asking the human; see
  Alternatives).
- **Forward compatibility with SSO-based host integrations**: independent of the correctness
  problem above, any future integration with a git host's own API — e.g. a GitHub or GitLab OAuth
  app authenticating the server to read repo state on the project's behalf — is itself
  `https://`/OAuth-based, not SSH. Requiring `https://` `origin` remotes now doesn't foreclose that
  path later; accepting SSH remotes now would mean either supporting two incompatible connectivity
  models later, or migrating every SSH-registered project's `remote_url` retroactively (the exact
  unbackfillable-gap problem this ADR exists to avoid).
- **No operational SSH key management**: an SSH-based connectivity path would require the server to
  hold and manage credentials (deploy keys, SSH agents) per registered host. An HTTPS/OAuth-based
  path defers credential management to each git host's own app-authorization model, which is the
  standard mechanism those hosts already provide for third-party integrations.

## Alternatives Considered

- **Derive `https://` from an SSH remote via a naive host-rewrite** (e.g. strip `git@`, replace
  `:` with `/`) — rejected: the `gitlab-forge` counter-example (dedicated `ssh.*` subdomain
  distinct from the web host) proves this isn't reliable in general, and a silently-wrong address
  is worse than an explicit rejection.
- **Accept any protocol and store the raw remote as `remote_url`** — rejected: it defers the
  correctness problem to whatever future code consumes `remote_url`, and locks in SSH as a
  connectivity path this ADR is deliberately trying to avoid committing to (see Rationale).
- **Defer `remote_url` persistence entirely until the synchronization capability is actually
  built** — rejected per ADR-018's own reasoning: `repo_key` can't be reconstructed back into a
  connectable host later, so projects registered before that capability exists would have an
  unbackfillable gap. Computing and storing `remote_url` now, even unused, avoids that.

## Consequences

**Positive**:

- ✅ Keeps the door open for OAuth/SSO-based git host integrations without a future data migration
- ✅ No SSH credential management burden is ever introduced server-side
- ✅ `remote_url` is captured for every project from day one, closing the unbackfillable-gap risk
  ADR-018 flagged

**Risks/Trade-offs**:

- ⚠️ SSH-only self-hosted setups can't register directly — the CLI's HTTPS-prompt fallback
  (US-1.3) covers this for now, but it's a manual step, not automatic
- ⚠️ The HTTPS-prompt fallback is unverified input: a mistyped or wrong-repo answer either creates
  a harmless orphaned project, or — if it coincidentally matches an existing `repo_key` — merges
  this repo's telemetry into an unrelated project. No ownership check exists to prevent this in the
  MVP (see US-1.3's CLI Behavior for the full accepted-limitation note)
- ⚠️ This ADR commits to a protocol constraint ahead of building the capability that needs it —
  if repository state synchronization is later built differently than assumed here (e.g. it turns
  out SSH-based access is unavoidable for some host), this decision needs revisiting
