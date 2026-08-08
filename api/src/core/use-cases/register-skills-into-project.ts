import type { ProjectRepository } from '../../infrastructure/project.repository.js'
import { DuplicateSkillNameError } from '../domain/project.js'

export class UnknownProjectError extends Error {}

export type RegisterSkillsIntoProjectResult =
  | { name: string; skillId: string }[]
  | UnknownProjectError
  | DuplicateSkillNameError

export class RegisterSkillsIntoProject {
  constructor(private readonly repository: ProjectRepository) {}

  run(projectId: string, names: string[]): RegisterSkillsIntoProjectResult {
    const project = this.repository.findById(projectId)

    if (!project) {
      return new UnknownProjectError()
    }

    const result = project.registerSkills(names)

    if (result instanceof DuplicateSkillNameError) {
      return result
    }

    this.repository.save(project)

    return project
      .snapshot()
      .skills.filter((skill) => names.includes(skill.name))
      .map((skill) => ({ name: skill.name, skillId: skill.id }))
  }
}
