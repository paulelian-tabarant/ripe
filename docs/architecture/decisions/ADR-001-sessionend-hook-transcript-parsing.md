# ADR-001: SessionEnd Hook + Transcript Parsing

**Status**: Accepted  
**Date**: 2026-06-18 (updated 2026-07-25 — detached execution, see "Reliability Testing" below)  
**Deciders**: Single developer MVP

## Context

We need to capture skill invocation events from Claude Code sessions. The main constraint is that we want
to instrument skill invocations without adding performance overhead or requiring changes to skill definitions
themselves.

Two primary approaches exist:

1. **PreToolUse hook** — fire a hook before each tool invocation
2. **SessionEnd hook + transcript parsing** — fire a hook once when the session ends, parse the full
   transcript

## Decision

Use Claude Code's `SessionEnd` hook to invoke the telemetry client script, which runs two sequential phases:

**Phase 1 — Skill sync**: reads `.claude/skills/`, registers any skills unknown to the local cache
with the server (`POST /api/skills`), and persists the returned server-assigned IDs locally.

**Phase 2 — Event submission**: parses the just-closed `.jsonl` transcript, resolves skill names to
server-assigned IDs from the local cache, and sends invocation events (`POST /api/events`).

`ripe sync` (the hook command) must not block session shutdown on this work. On invocation, it
spawns a detached copy of itself (`child_process.spawn(..., { detached: true, stdio: 'ignore'
}).unref()`) to run Phase 1 and 2, then exits `0` immediately. See "Reliability Testing
(2026-07-25)" below for why.

**Feedback on completion**: stays silent on success. On failure, the detached process writes an
outcome record locally (e.g. `.ripe/last-sync.json` — status, timestamp, error), and the *next*
`ripe` invocation (`init`, `sync`, or a future `ripe status`) prints a warning if the last run
failed. There is no synchronous point left to report success or failure at exit time, since the
parent process (and often the terminal/session) is already gone by the time the detached work
completes — see below.

## Rationale

**Why PreToolUse was abandoned**:

- PreToolUse fires before the skill loads, meaning the hook cannot access the skill's frontmatter
  (including `skill_id`)
- Would require running logic on every tool invocation (performance impact)
- Session resume/pause would fire the hook multiple times

**Why SessionEnd + transcript parsing is superior**:

- ✅ Full transcript available — all invocations captured in one pass
- ✅ No impact on session performance (runs after session closes)
- ✅ Transcript format is stable (31 patch versions tested with zero structural changes)
- ✅ One invocation per session, naturally deduplicates across resume/pause cycles
- ✅ Skill sync in Phase 1 ensures all IDs are resolved before Phase 2 runs — no skipped events

## Reliability Testing (2026-07-25)

The "resilient: session end is not blocked" and "no impact on session performance" claims below
were asserted at the time of this ADR, not measured. Before committing to this design for
Slice 3, ran a local POC: a `SessionEnd` hook running a blocking 8-second operation (standing in
for `ripe sync`'s parse + HTTP work), tested against every real way a developer ends a session.

| Termination path                       | Hook fired? | Completed? |
| -------------------------------------- | ----------- | ---------- |
| `/exit` (bare shell)                   | Yes         | Yes        |
| `/exit` (IntelliJ integrated terminal) | Yes         | Yes        |
| Terminal window closed, no `/exit`     | Yes         | Yes        |
| `/clear`                               | Yes         | Yes        |
| IntelliJ window closed                 | Yes         | Yes        |
| JetBrains plugin panel closed          | Yes         | Yes        |
| `kill -9` on the `claude` process      | No          | No         |

Every graceful termination path — including simply closing the whole IDE — reliably fires
`SessionEnd` and lets it run to completion. Only an unblockable kill signal (crash, OOM-kill,
`kill -9`) prevents it, a failure mode no hook-based design survives regardless.

**Problem found**: a blocking hook introduces a real, felt delay on `/exit`, `/clear`, and
window-close — Claude Code waits for the hook command to finish before completing session
shutdown. This was confirmed by feel, not just by measuring timestamps.

**Fix validated**: had the hook script spawn a fully detached child (bash + `python3 -c
"os.setsid()"`, since macOS ships no `setsid` binary) and return immediately. The hook returned
in milliseconds, `/exit` felt instant, and the detached child still completed and logged its
result 8 seconds later, independent of the parent. In the real implementation, `child_process.spawn(...,
{ detached: true, stdio: 'ignore' }).unref()` gives the same guarantee natively in Node
(`detached: true` calls `setsid()` internally on POSIX) — no shell/Python wrapper needed.

## Alternatives Considered

- **A. PreToolUse hook** — real-time capture but loses frontmatter context, higher overhead, harder to handle
  session resume
- **B. Modify skill files to emit telemetry** — breaks on skill updates, high maintenance burden,
  intrusive
- **C. SessionEnd + transcript parsing** ← **Chosen** — simple, decoupled, resilient

## Consequences

**Positive**:

- ✅ Simple, decoupled implementation
- ✅ Resilient: session shutdown is never blocked on telemetry work, enforced by detached spawn
  (not just assumed) — confirmed empirically reliable across every real exit path, including
  closing the whole IDE
- ✅ Works naturally with session resume/pause (no double-counting)
- ✅ All invocation data captured in one pass

**Risks/Trade-offs**:

- ⚠️ Slight delay: invocations only tracked after session closes (acceptable for a dashboard used after
  work is done)
- ⚠️ Depends on transcript format stability (mitigated by version detection and schema validation tests)
- ⚠️ An unblockable kill (`kill -9`, crash, OOM) drops that session's events entirely — accepted,
  since no hook-based design survives it
- ⚠️ Failure feedback is deferred to the next `ripe` invocation, not immediate — a broken server
  URL can go unnoticed until the developer happens to run `ripe` again
- ⚠️ Detached-spawn correctness matters: must fully release stdio (`stdio: 'ignore'`) and call
  `.unref()`, or the parent may still wait on the child implicitly
