# ripe

CLI for the ripe telemetry system.

## Install

```bash
npm install -g @paulelian-tabarant/ripe --registry=https://npm.pkg.github.com
```

GitHub Packages requires authentication even for public packages. Configure a personal access
token first:

- [Creating a personal access token](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens)
  — use a **classic** token (GitHub Packages doesn't support fine-grained tokens for npm), scope
  `read:packages`.
- [Authenticating to GitHub Packages with npm](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-npm-registry)
  — add the token to your `~/.npmrc`.

## Usage

```bash
ripe init
```

Prompts for the server URL and writes `.ripe/settings.json` (`serverUrl`) and `.ripe/cache.json`
(`projectId`).

### Changing the server URL

The server URL is cached locally in `.ripe/settings.json`, not read from an env var. Re-running
`ripe init` shows the existing `serverUrl` and asks whether to keep it or enter a new one — to
point at a different server (e.g. a throwaway test instance, or a team switching servers), decline
and enter the new URL. If the new server has empty state (not just a new URL for the same
backend), treat it as a fresh registration — everything cached locally (project ID, skill IDs) is
tied to the old server and won't resolve against the new one.
