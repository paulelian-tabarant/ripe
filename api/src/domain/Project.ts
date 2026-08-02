import GitUrlParse from 'git-url-parse'
import { nanoid } from 'nanoid'

export class InvalidRemoteUrlError extends Error {
  constructor(remoteUrl: string) {
    super(`Could not derive a repoKey from remoteUrl: ${remoteUrl}`)
    this.name = 'InvalidRemoteUrlError'
  }
}

const MANAGED_PROTOCOLS = new Set(['https'])

export class Project {
  private constructor(
    readonly id: string,
    readonly name: string,
    readonly repoKey: string,
    readonly remoteUrl: string,
  ) {}

  static create(name: string, remoteUrl: string): Project | InvalidRemoteUrlError {
    let parsed: ReturnType<typeof GitUrlParse>

    try {
      parsed = GitUrlParse(remoteUrl)
    } catch {
      return new InvalidRemoteUrlError(remoteUrl)
    }

    if (
      !parsed.source ||
      !parsed.owner ||
      !parsed.name ||
      !MANAGED_PROTOCOLS.has(parsed.protocol)
    ) {
      return new InvalidRemoteUrlError(remoteUrl)
    }

    const repoKey = `${parsed.source}/${parsed.owner}/${parsed.name}`
    const normalizedRemoteUrl = `https://${parsed.resource}/${parsed.owner}/${parsed.name}`

    return new Project(`proj_${nanoid()}`, name, repoKey, normalizedRemoteUrl)
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
