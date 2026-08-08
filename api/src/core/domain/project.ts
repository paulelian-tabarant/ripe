import { nanoid } from 'nanoid'
import { GitRepository } from './git-repository.js'

export class Project {
  private constructor(
    readonly id: string,
    readonly name: string,
    readonly gitRepository: GitRepository,
  ) {}

  static create(name: string, gitRepository: GitRepository): Project {
    return new Project(`proj_${nanoid()}`, name, gitRepository)
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
