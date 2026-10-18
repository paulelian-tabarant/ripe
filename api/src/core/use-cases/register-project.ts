import type { ProjectRepository } from '../../infrastructure/project.repository.js'
import { GitRemote } from '../domain/git-remote.js'
import { InvalidRemoteUrlError } from '../domain/invalid-remote-url-error.js'
import { Project } from '../domain/project.js'

export type RegisterProjectResult = { created: boolean; projectId: string } | InvalidRemoteUrlError

export class RegisterProject {
  constructor(private readonly repository: ProjectRepository) {}

  run(name: string, remoteUrl: string): RegisterProjectResult {
    const gitRemote = GitRemote.resolve(remoteUrl)

    if (gitRemote instanceof InvalidRemoteUrlError) {
      return gitRemote
    }

    const existing = this.repository.getByRepoKey(gitRemote.repoKey)

    if (existing) {
      return { created: false, projectId: existing.id }
    }

    const project = Project.create(name, gitRemote)

    this.repository.addNewProject(project)

    return { created: true, projectId: project.id }
  }
}
