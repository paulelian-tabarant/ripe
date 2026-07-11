import { nanoid } from 'nanoid';
import type { ProjectRepository } from '../repositories/ProjectRepository.js';

export type RegisterProjectResult = { created: boolean; projectId: string };

export class ProjectService {
  constructor(private readonly repository: ProjectRepository) {}

  registerProject(name: string): RegisterProjectResult {
    const existing = this.repository.findByName(name);

    if (existing) {
      return { created: false, projectId: existing.id };
    }

    const projectId = `proj_${nanoid()}`;
    this.repository.insert({ id: projectId, name });

    return { created: true, projectId };
  }
}
