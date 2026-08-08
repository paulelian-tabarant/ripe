import type { ProjectRepository } from '../../infrastructure/project.repository.js'
import { DuplicateSkillNameError } from '../domain/project.js'

export class UnknownProjectError extends Error {}

export type RegisterSkillsIntoProjectResult =
  | Array<{ name: string; skillId: string }>
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

    const skillIdsByName = new Map(project.snapshot().skills.map((skill) => [skill.name, skill.id]))

    return names.flatMap((name) => {
      const skillId = skillIdsByName.get(name)

      return skillId ? [{ name, skillId }] : []
    })
  }
}
