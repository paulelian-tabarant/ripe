import type { ProjectListItem, ProjectRepository } from '../repositories/ProjectRepository.js'

export class ListProjects {
  constructor(private readonly repository: ProjectRepository) {}

  run(): ProjectListItem[] {
    return this.repository.list()
  }
}
