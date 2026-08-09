# 🍇 Ripe

**Visibility into which custom skills are actually being used by your coding agent teams.**

> **License:** Free for personal and non-commercial use under the PolyForm Noncommercial License
> 1.0.0. For commercial use, please contact <paul.tabarant@gmail.com> to obtain a commercial license.

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

## Installation

Install the `ripe` CLI to start tracking skill invocations in your own project:

```bash
npm install -g @paulelian-tabarant/ripe --registry=https://npm.pkg.github.com
ripe init
```

GitHub Packages requires authentication even for public packages — see
[`cli/README.md`](cli/README.md#install) for the personal access token setup.

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for repo setup, coding standards, and how to run/test
the project locally.

### Architecture Docs

The [C4 architecture diagrams](docs/architecture/architecture.c4) are published to GitHub Pages:
**<https://paulelian-tabarant.github.io/ripe/>**.

## License

This project is licensed under the [PolyForm Noncommercial License 1.0.0](LICENSE). In plain
language: you're free to use, modify, and share this software for personal, educational, research,
and other noncommercial purposes, but commercial use requires a separate commercial license.
Contact <paul.tabarant@gmail.com> for commercial licensing.
