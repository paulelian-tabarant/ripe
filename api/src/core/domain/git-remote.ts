import { InvalidRemoteUrlError } from './invalid-remote-url-error.js'
import { resolveGitRemote } from './resolve-git-remote.js'

export class GitRemote {
  private constructor(
    readonly repoKey: string,
    readonly remoteUrl: string,
  ) {}

  static resolve(remoteUrl: string): GitRemote | InvalidRemoteUrlError {
    const resolved = resolveGitRemote(remoteUrl)

    if (resolved instanceof InvalidRemoteUrlError) {
      return resolved
    }

    return GitRemote.create(resolved)
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
