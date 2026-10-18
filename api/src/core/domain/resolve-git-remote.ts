import GitUrlParse from 'git-url-parse'
import { type GitRemoteCreationDto, InvalidRemoteUrlError } from './git-remote.js'

const MANAGED_PROTOCOLS = new Set(['https'])

export function resolveGitRemote(rawUrl: string): GitRemoteCreationDto | InvalidRemoteUrlError {
  let parsed: ReturnType<typeof GitUrlParse>

  try {
    parsed = GitUrlParse(rawUrl)
  } catch {
    return new InvalidRemoteUrlError(rawUrl)
  }

  if (!parsed.source || !parsed.owner || !parsed.name || !MANAGED_PROTOCOLS.has(parsed.protocol)) {
    return new InvalidRemoteUrlError(rawUrl)
  }

  return {
    repoKey: `${parsed.source}/${parsed.owner}/${parsed.name}`,
    remoteUrl: `https://${parsed.resource}/${parsed.owner}/${parsed.name}`,
  }
}
