import { nanoid } from 'nanoid'
import { ProjectRepoReference } from './ProjectRepoReference.js'

export class Project {
  private constructor(
    readonly id: string,
    readonly name: string,
    readonly repoReference: ProjectRepoReference,
  ) {}

  static create(name: string, repoReference: ProjectRepoReference): Project {
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
      ProjectRepoReference.reconstitute({ repoKey: data.repoKey, remoteUrl: data.remoteUrl }),
    )
  }
}
