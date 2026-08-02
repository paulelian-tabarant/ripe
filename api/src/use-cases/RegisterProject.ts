import { nanoid } from 'nanoid'
import { normalizeRepoKey } from '../lib/normalizeRepoKey.js'
import type { ProjectRepository } from '../repositories/ProjectRepository.js'

export class InvalidRemoteUrlError extends Error {
  constructor(remoteUrl: string) {
    super(`Could not derive a repoKey from remoteUrl: ${remoteUrl}`)
    this.name = 'InvalidRemoteUrlError'
  }
}

export type RegisterProjectResult = { created: boolean; projectId: string } | InvalidRemoteUrlError

export class RegisterProject {
  constructor(private readonly repository: ProjectRepository) {}

  run(name: string, remoteUrl: string): RegisterProjectResult {
    const repoKey = normalizeRepoKey(remoteUrl)

    if (repoKey === undefined) {
      return new InvalidRemoteUrlError(remoteUrl)
    }

    const existing = this.repository.getByRepoKey(repoKey)

    if (existing) {
      return { created: false, projectId: existing.id }
    }

    const projectId = `proj_${nanoid()}`
    this.repository.addNewProject({ id: projectId, name, repoKey })

    return { created: true, projectId }
  }
}
