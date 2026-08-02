import GitUrlParse from 'git-url-parse'
import { nanoid } from 'nanoid'

export class InvalidRemoteUrlError extends Error {
  constructor(remoteUrl: string) {
    super(`Could not derive a repoKey from remoteUrl: ${remoteUrl}`)
    this.name = 'InvalidRemoteUrlError'
  }
}

const MANAGED_PROTOCOLS = new Set(['https'])

interface ParsedRemote {
  repoKey: string
  remoteUrl: string
}

function parseRemote(remoteUrl: string): ParsedRemote | InvalidRemoteUrlError {
  let parsed: ReturnType<typeof GitUrlParse>

  try {
    parsed = GitUrlParse(remoteUrl)
  } catch {
    return new InvalidRemoteUrlError(remoteUrl)
  }

  if (!parsed.source || !parsed.owner || !parsed.name || !MANAGED_PROTOCOLS.has(parsed.protocol)) {
    return new InvalidRemoteUrlError(remoteUrl)
  }

  return {
    repoKey: `${parsed.source}/${parsed.owner}/${parsed.name}`,
    remoteUrl: `https://${parsed.resource}/${parsed.owner}/${parsed.name}`,
  }
}

export class Project {
  private constructor(
    readonly id: string,
    readonly name: string,
    readonly repoKey: string,
    readonly remoteUrl: string,
  ) {}

  static resolveRepoKey(remoteUrl: string): string | InvalidRemoteUrlError {
    const parsed = parseRemote(remoteUrl)

    return parsed instanceof InvalidRemoteUrlError ? parsed : parsed.repoKey
  }

  static create(name: string, remoteUrl: string): Project | InvalidRemoteUrlError {
    const parsed = parseRemote(remoteUrl)

    if (parsed instanceof InvalidRemoteUrlError) return parsed

    return new Project(`proj_${nanoid()}`, name, parsed.repoKey, parsed.remoteUrl)
  }

  static reconstitute(data: {
    id: string
    name: string
    repoKey: string
    remoteUrl: string
  }): Project {
    return new Project(data.id, data.name, data.repoKey, data.remoteUrl)
  }
}
