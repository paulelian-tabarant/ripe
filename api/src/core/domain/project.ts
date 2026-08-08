import { nanoid } from 'nanoid'
import { GitRepository } from './git-repository.js'
import { Skill } from './skill.js'

export class Project {
  private constructor(
    readonly id: string,
    private readonly name: string,
    private readonly gitRepository: GitRepository,
    private readonly skills: Skill[] = [],
  ) {}

  static create(name: string, gitRepository: GitRepository): Project {
    return new Project(`proj_${nanoid()}`, name, gitRepository)
  }

  static reconstitute(data: {
    id: string
    name: string
    repoKey: string
    remoteUrl: string
    skills?: Skill[]
  }): Project {
    return new Project(
      data.id,
      data.name,
      GitRepository.reconstitute({ repoKey: data.repoKey, remoteUrl: data.remoteUrl }),
      data.skills,
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
        this.skills.push(Skill.create(this.id, name))
      }
    }
  }

  snapshot(): ProjectSnapshot {
    return {
      id: this.id,
      name: this.name,
      repoKey: this.gitRepository.repoKey,
      remoteUrl: this.gitRepository.remoteUrl,
      skills: this.skills.map((skill) => ({ id: skill.id, name: skill.name })),
    }
  }
}

export class DuplicateSkillNameError extends Error {}

export type ProjectSnapshot = {
  id: string
  name: string
  repoKey: string
  remoteUrl: string
  skills: { id: string; name: string }[]
}
