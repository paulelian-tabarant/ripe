# Agent Compatibility Analysis

**Purpose**: Assess the feasibility of extending skill usage tracking to other coding agents
beyond Claude Code.

**Conclusion**: The architecture is **agent-agnostic** at the API level. MVP focuses on Claude Code;
adapters for other agents are straightforward future work.

---

## High-Level Strategy

Yes, this can work with Cursor, Windsurf, Copilot, Gemini Code Assist, etc. via **client-side adapters**.

**Architecture**:

```text
┌─────────────────┐
│ Claude Code CLI │──> telemetry client script (name TBD)
│   .jsonl logs   │                │
└─────────────────┘                │
                                   ▼
┌─────────────────┐         ┌──────────────┐
│ Cursor logs     │──>      │ Unified API  │──> Storage & Dashboard
└─────────────────┘  adapter│ {skill_id,   │
                             │  timestamp,  │
┌─────────────────┐          │  dev_id, ... }│
│ Windsurf logs   │──>      └──────────────┘
└─────────────────┘  adapter
```

---

## Requirements per Agent

Each agent needs to satisfy:

- ✅ **Stores conversation logs/transcripts** (most do)
- ✅ **Logs contain skill/tool invocations** (or can be inferred)
- ✅ **Adapter script can parse their format** → unified API format

---

## Limitation

Agents that don't persist logs can't use transcript-based approach (would need hook-based or
other real-time approach).

---

## MVP Decision

**Focus on Claude Code** — design the API to be agent-agnostic so adapters can be added later.

The server expects:

```typescript
interface SkillInvocationEvent {
    event_type: "skill_invocation";
    timestamp: string;
    user_email: string;
    user_name: string;
    project_id: string;
    session_id: string;
    client_type: string;
    payload: {
        skill_id: string;
        skill_name: string;
        tool_use_id: string;
    };
}
```

Any agent adapter producing this payload works with the existing server and dashboard.

**Adapter contract for `session_id` / `tool_use_id`**: the server dedups on `(project_id,
session_id, tool_use_id)`, so it's the adapter's responsibility — not the coding agent's, and not
guaranteed for free by the unified API shape — to make both fields stable and unique across
re-parses of the same source log: re-submitting the same session must yield the same IDs, and two
distinct invocations must never produce the same pair. For agents with native per-session and
per-invocation IDs (Claude Code, OpenCode, likely Copilot CLI/Gemini CLI/Cursor), the adapter can
just pass those through. For agents without one (Aider's markdown transcript, Windsurf,
Continue.dev), the adapter must synthesize an ID itself — e.g. a hash of transcript position +
content — and own making that synthesis deterministic and collision-resistant.

---

## Agent Compatibility Matrix

| Agent                  | Format               | Location                                | Adapter Complexity                                                                        |
|------------------------|----------------------|-----------------------------------------|-------------------------------------------------------------------------------------------|
| **Claude Code**        | JSONL                | `~/.claude/projects/`                   | ✅ Easy (MVP target)                                                                      |
| **GitHub Copilot CLI** | JSONL                | `~/.copilot/session-state/`             | ✅ Easy                                                                                   |
| **Gemini CLI**         | JSON                 | `~/.gemini/tmp/`                        | ✅ Easy                                                                                   |
| **OpenCode**           | SQLite (Drizzle ORM) | `~/.local/share/opencode/opencode.db`   | ⚠️ SQL queries - but has `ToolPart` type for tool invocations + `opencode export` to JSON |
| **Cursor**             | SQLite               | `~/Library/Application Support/Cursor/` | ⚠️ SQL queries                                                                            |
| **Aider**              | Markdown             | `.aider.chat.history.md`                | ⚠️ Text parsing                                                                           |
| **Windsurf**           | No full session logs | `~/.codeium/windsurf/memories/`         | ❌ Different approach needed                                                              |
| **Continue.dev**       | Manual export only   | `~/.continue/session-transcripts/`      | ❌ Different approach needed                                                              |

---

## Example: OpenCode SQL Adapter

```sql
SELECT p.*, m.sessionID, m.time
FROM parts p
         JOIN messages m ON p.messageID = m.id
WHERE p.type = 'ToolPart'
  AND p.tool = 'Skill'
```

This query extracts skill invocations from OpenCode's SQLite database, which can then be mapped
to the unified `SkillInvocationEvent` format.

---

## Recommendation for Future Iterations

1. Keep the server API stable and well-documented
2. Add adapters for GitHub Copilot CLI and Gemini CLI (easiest wins, JSONL parsing)
3. Document the adapter pattern for teams wanting to build their own (Cursor, Aider, etc.)
4. For agents without persistent logs (Windsurf, Continue.dev), design a real-time hook approach
   as a separate feature
