import type {
  ProjectReadModel,
  ProjectRepository,
} from '../../infrastructure/project.repository.js'

export class ListProjects {
  constructor(private readonly repository: ProjectRepository) {}

  run(): ProjectReadModel[] {
    return this.repository.list()
  }
}
