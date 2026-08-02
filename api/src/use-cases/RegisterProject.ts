import { Project } from '../domain/Project.js'
import { InvalidRemoteUrlError, ProjectRepoReference } from '../domain/ProjectRepoReference.js'
import type { ProjectRepository } from '../repositories/ProjectRepository.js'

export type RegisterProjectResult = { created: boolean; projectId: string } | InvalidRemoteUrlError

export class RegisterProject {
  constructor(private readonly repository: ProjectRepository) {}

  run(name: string, remoteUrl: string): RegisterProjectResult {
    const repoReference = ProjectRepoReference.resolve(remoteUrl)

    if (repoReference instanceof InvalidRemoteUrlError) {
      return repoReference
    }

    const existing = this.repository.getByRepoKey(repoReference.repoKey)

    if (existing) {
      return { created: false, projectId: existing.id }
    }

    const project = Project.create(name, repoReference)

    this.repository.addNewProject(project)

    return { created: true, projectId: project.id }
  }
}
