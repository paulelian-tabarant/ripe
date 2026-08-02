import type { ProjectReadModel, ProjectRepository } from '../repositories/ProjectRepository.js'

export class ListProjects {
  constructor(private readonly repository: ProjectRepository) {}

  run(): ProjectReadModel[] {
    return this.repository.list()
  }
}
