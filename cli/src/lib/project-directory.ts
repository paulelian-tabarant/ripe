import { basename } from 'node:path'

export interface ProjectDirectory {
  getPath(): string
  getName(): string
}

export function createProjectDirectory(getCurrentDirectoryName: () => string): ProjectDirectory {
  return {
    getPath: (): string => getCurrentDirectoryName(),
    getName: (): string => basename(getCurrentDirectoryName()),
  }
}
