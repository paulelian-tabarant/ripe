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

Prompts for the server URL and writes `.ripe/config.json`.
