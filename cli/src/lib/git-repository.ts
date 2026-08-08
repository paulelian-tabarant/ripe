import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import type { ProjectDirectory } from './projectDirectory.js'

const execFileAsync = promisify(execFile)

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

async function getRemoteUrl(cwd: string): Promise<string> {
  const { stdout } = await execFileAsync('git', ['remote', 'get-url', 'origin'], { cwd })

  return stdout.trim()
}
