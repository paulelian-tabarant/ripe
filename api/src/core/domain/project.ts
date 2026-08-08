import { nanoid } from 'nanoid'
import { GitRepository } from './git-repository.js'

export class Project {
  private constructor(
    readonly id: string,
    readonly name: string,
    readonly repoReference: GitRepository,
  ) {}

  static create(name: string, repoReference: GitRepository): Project {
    return new Project(`proj_${nanoid()}`, name, repoReference)
  }

  static reconstitute(data: {
    id: string
    name: string
    repoKey: string
    remoteUrl: string
  }): Project {
    return new Project(
      data.id,
      data.name,
      GitRepository.reconstitute({ repoKey: data.repoKey, remoteUrl: data.remoteUrl }),
    )
  }
}
