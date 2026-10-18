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

  static fromPersistence(dto: SkillPersistenceDto): Skill {
    return new Skill(dto.id, dto.projectId, dto.name)
  }

  toPersistence(): SkillPersistenceDto {
    return { id: this.id, projectId: this.projectId, name: this.name }
  }

  toExposition(): SkillExpositionDto {
    return { id: this.id, name: this.name }
  }
}

export type SkillPersistenceDto = {
  id: string
  projectId: string
  name: string
}

export type SkillExpositionDto = Omit<SkillPersistenceDto, 'projectId'>
