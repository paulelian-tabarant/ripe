import { nanoid } from 'nanoid'
import { GitRemote } from './git-remote.js'
import { Skill, type SkillExpositionDto, type SkillPersistenceDto } from './skill.js'

export class Project {
  private constructor(
    readonly id: string,
    private readonly name: string,
    private readonly gitRemote: GitRemote,
    private readonly skills: Skill[] = [],
  ) {}

  static create(name: string, gitRemote: GitRemote): Project {
    return new Project(`proj_${nanoid()}`, name, gitRemote)
  }

  static fromPersistence(dto: ProjectPersistenceDto): Project {
    return new Project(
      dto.id,
      dto.name,
      GitRemote.fromPersistence({ repoKey: dto.repoKey, remoteUrl: dto.remoteUrl }),
      dto.skills.map((skill) => Skill.fromPersistence(skill)),
    )
  }

  registerSkills(names: string[]): void | DuplicateSkillNameError {
    const uniqueNames = new Set(names)

    if (uniqueNames.size !== names.length) {
      return new DuplicateSkillNameError()
    }

    for (const name of names) {
      const existing = this.skills.find((skill) => skill.name === name)

      if (!existing) {
        this.skills.push(Skill.create({ projectId: this.id, name }))
      }
    }
  }

  toPersistence(): ProjectPersistenceDto {
    return {
      id: this.id,
      name: this.name,
      repoKey: this.gitRemote.repoKey,
      remoteUrl: this.gitRemote.remoteUrl,
      skills: this.skills.map((skill) => skill.toPersistence()),
    }
  }

  toExposition(): ProjectExpositionDto {
    return {
      id: this.id,
      name: this.name,
      repoKey: this.gitRemote.repoKey,
      remoteUrl: this.gitRemote.remoteUrl,
      skills: this.skills.map((skill) => skill.toExposition()),
    }
  }
}

export class DuplicateSkillNameError extends Error {}

export type ProjectPersistenceDto = {
  id: string
  name: string
  repoKey: string
  remoteUrl: string
  skills: SkillPersistenceDto[]
}

export type ProjectExpositionDto = Omit<ProjectPersistenceDto, 'skills'> & {
  skills: SkillExpositionDto[]
}
