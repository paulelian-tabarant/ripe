import { getRemoteUrl } from './getRemoteUrl.js'
import type { ProjectDirectory } from './projectDirectory.js'

export interface GitRepository {
  getRemoteUrl(): Promise<string>
  isHttpsRemote(remoteUrl: string): boolean
}

export function createGitRepository(projectDirectory: ProjectDirectory): GitRepository {
  return {
    getRemoteUrl: (): Promise<string> => getRemoteUrl(projectDirectory.getPath()),
    isHttpsRemote: (remoteUrl: string): boolean => remoteUrl.startsWith('https://'),
  }
}
