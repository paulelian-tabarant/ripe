# 🍇 Ripe

**Visibility into which custom skills are actually being used by your coding agent teams.**

## The Problem

Teams create custom skills for their coding agents but have no way to know:

- Which skills are actually being invoked
- Which team members leverage skills effectively  
- Whether a skill is worth maintaining or should be deprecated

## The Solution

This project tracks skill invocation events across teams, providing:

- **Invocation metrics**: which skills are used, how often, and by whom
- **Usage rankings**: identify most and least-used skills over time
- **Deprecation signals**: detect unused skills that may need attention

Focus is on custom `.claude/skills/` defined within projects — the skills teams maintain themselves
— not third-party plugins.
