import GitUrlParse from 'git-url-parse'

export class InvalidRemoteUrlError extends Error {
  constructor(remoteUrl: string) {
    super(`Could not derive a repoKey from remoteUrl: ${remoteUrl}`)
    this.name = 'InvalidRemoteUrlError'
  }
}

const MANAGED_PROTOCOLS = new Set(['https'])

export class ProjectRepoReference {
  private constructor(
    readonly repoKey: string,
    readonly remoteUrl: string,
  ) {}

  static resolve(remoteUrl: string): ProjectRepoReference | InvalidRemoteUrlError {
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

    return new ProjectRepoReference(
      `${parsed.source}/${parsed.owner}/${parsed.name}`,
      `https://${parsed.resource}/${parsed.owner}/${parsed.name}`,
    )
  }

  static reconstitute(data: { repoKey: string; remoteUrl: string }): ProjectRepoReference {
    return new ProjectRepoReference(data.repoKey, data.remoteUrl)
  }
}
