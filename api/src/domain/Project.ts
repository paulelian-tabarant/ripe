import GitUrlParse from 'git-url-parse'
import { nanoid } from 'nanoid'

export class InvalidRemoteUrlError extends Error {
  constructor(remoteUrl: string) {
    super(`Could not derive a repoKey from remoteUrl: ${remoteUrl}`)
    this.name = 'InvalidRemoteUrlError'
  }
}

const MANAGED_PROTOCOLS = ['https']

export type ProjectIdentity = {
  repoKey: string
  remoteUrl: string
}

export class Project {
  private constructor(
    readonly id: string,
    readonly name: string,
    readonly repoKey: string,
    readonly remoteUrl: string,
  ) {}

  static deriveIdentity(remoteUrl: string): ProjectIdentity | InvalidRemoteUrlError {
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
      !MANAGED_PROTOCOLS.includes(parsed.protocol)
    ) {
      return new InvalidRemoteUrlError(remoteUrl)
    }

    return {
      repoKey: `${parsed.source}/${parsed.owner}/${parsed.name}`,
      remoteUrl: `https://${parsed.resource}/${parsed.owner}/${parsed.name}`,
    }
  }

  static create(name: string, identity: ProjectIdentity): Project {
    return new Project(`proj_${nanoid()}`, name, identity.repoKey, identity.remoteUrl)
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
