import { InvalidRemoteUrlError, Project } from '../domain/Project.js'
import type { ProjectRepository } from '../repositories/ProjectRepository.js'

export type RegisterProjectResult = { created: boolean; projectId: string } | InvalidRemoteUrlError

export class RegisterProject {
  constructor(private readonly repository: ProjectRepository) {}

  run(name: string, remoteUrl: string): RegisterProjectResult {
    const project = Project.create(name, remoteUrl)

    if (project instanceof InvalidRemoteUrlError) {
      return project
    }

    const existing = this.repository.getByRepoKey(project.repoKey)

    if (existing) {
      return { created: false, projectId: existing.id }
    }

    this.repository.addNewProject(project)

    return { created: true, projectId: project.id }
  }
}
