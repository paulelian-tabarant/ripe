import { getRemoteUrl } from './getRemoteUrl.js'

export interface GitRepository {
  getRemoteUrl(): Promise<string>
  isHttpsRemote(remoteUrl: string): boolean
}

export function createGitRepository(cwd: string): GitRepository {
  return {
    getRemoteUrl: (): Promise<string> => getRemoteUrl(cwd),
    isHttpsRemote: (remoteUrl: string): boolean => remoteUrl.startsWith('https://'),
  }
}
