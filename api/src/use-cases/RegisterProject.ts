import { InvalidRemoteUrlError, Project } from '../domain/Project.js'
import type { ProjectRepository } from '../repositories/ProjectRepository.js'

export type RegisterProjectResult = { created: boolean; projectId: string } | InvalidRemoteUrlError

export class RegisterProject {
  constructor(private readonly repository: ProjectRepository) {}

  run(name: string, remoteUrl: string): RegisterProjectResult {
    const repoKey = Project.resolveRepoKey(remoteUrl)

    if (repoKey instanceof InvalidRemoteUrlError) {
      return repoKey
    }

    const existing = this.repository.getByRepoKey(repoKey)

    if (existing) {
      return { created: false, projectId: existing.id }
    }

    const project = Project.create(name, remoteUrl)

    if (project instanceof InvalidRemoteUrlError) {
      return project
    }

    this.repository.addNewProject(project)

    return { created: true, projectId: project.id }
  }
}
