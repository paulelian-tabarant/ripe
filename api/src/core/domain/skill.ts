import { nanoid } from 'nanoid'

export class Skill {
  private constructor(
    readonly id: string,
    readonly projectId: string,
    readonly name: string,
  ) {}

  static create(projectId: string, name: string): Skill {
    return new Skill(`skill_${nanoid()}`, projectId, name)
  }

  static reconstitute(data: { id: string; projectId: string; name: string }): Skill {
    return new Skill(data.id, data.projectId, data.name)
  }
}
