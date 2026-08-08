import type { ProjectRepository } from '../../infrastructure/project.repository.js'
import { GitRepository, InvalidRemoteUrlError } from '../domain/git-repository.js'
import { Project } from '../domain/project.js'

export type RegisterProjectResult = { created: boolean; projectId: string } | InvalidRemoteUrlError

export class RegisterProject {
  constructor(private readonly repository: ProjectRepository) {}

  run(name: string, remoteUrl: string): RegisterProjectResult {
    const repoReference = GitRepository.resolve(remoteUrl)

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
