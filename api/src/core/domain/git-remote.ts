import GitUrlParse from 'git-url-parse'

export class InvalidRemoteUrlError extends Error {
  constructor(remoteUrl: string) {
    super(`Could not derive a repoKey from remoteUrl: ${remoteUrl}`)
    this.name = 'InvalidRemoteUrlError'
  }
}

const MANAGED_PROTOCOLS = new Set(['https'])

export class GitRemote {
  private constructor(
    readonly repoKey: string,
    readonly remoteUrl: string,
  ) {}

  static resolve(remoteUrl: string): GitRemote | InvalidRemoteUrlError {
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

    return GitRemote.create({
      repoKey: `${parsed.source}/${parsed.owner}/${parsed.name}`,
      remoteUrl: `https://${parsed.resource}/${parsed.owner}/${parsed.name}`,
    })
  }

  static create(dto: GitRemoteCreationDto): GitRemote {
    return new GitRemote(dto.repoKey, dto.remoteUrl)
  }

  static fromPersistence(dto: GitRemotePersistenceDto): GitRemote {
    return new GitRemote(dto.repoKey, dto.remoteUrl)
  }

  toPersistence(): GitRemotePersistenceDto {
    return { repoKey: this.repoKey, remoteUrl: this.remoteUrl }
  }

  toExposition(): GitRemoteExpositionDto {
    return this.toPersistence()
  }
}

export type GitRemotePersistenceDto = {
  repoKey: string
  remoteUrl: string
}

export type GitRemoteExpositionDto = GitRemotePersistenceDto

export type GitRemoteCreationDto = {
  repoKey: string
  remoteUrl: string
}
