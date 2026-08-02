import { InvalidRemoteUrlError, Project, RepoIdentity } from '../domain/Project.js'
import type { ProjectRepository } from '../repositories/ProjectRepository.js'

export type RegisterProjectResult = { created: boolean; projectId: string } | InvalidRemoteUrlError

export class RegisterProject {
  constructor(private readonly repository: ProjectRepository) {}

  run(name: string, remoteUrl: string): RegisterProjectResult {
    const identity = RepoIdentity.resolve(remoteUrl)

    if (identity instanceof InvalidRemoteUrlError) {
      return identity
    }

    const existing = this.repository.getByRepoKey(identity.repoKey)

    if (existing) {
      return { created: false, projectId: existing.id }
    }

    const project = Project.create(name, identity)

    this.repository.addNewProject(project)

    return { created: true, projectId: project.id }
  }
}
