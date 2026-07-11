import type { Project, ProjectRepository } from '../repositories/ProjectRepository.js'

export class ListProjects {
  constructor(private readonly repository: ProjectRepository) {}

  run(): Project[] {
    return this.repository.findAll()
  }
}
