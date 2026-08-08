import { getRemoteUrl } from './getRemoteUrl.js'

export interface GitRepository {
  getRemoteUrl(): Promise<string>
  isHttpsRemote(remoteUrl: string): boolean
}

export function createGitRepository(getCurrentDirectoryName: () => string): GitRepository {
  return {
    getRemoteUrl: (): Promise<string> => getRemoteUrl(getCurrentDirectoryName()),
    isHttpsRemote: (remoteUrl: string): boolean => remoteUrl.startsWith('https://'),
  }
}
