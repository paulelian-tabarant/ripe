import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import type { ProjectDirectory } from './project-directory.js'

const execFileAsync = promisify(execFile)

export interface GitRepository {
  getRemoteUrl(): Promise<string>
  isHttpsRemote(remoteUrl: string): boolean
  hasLocalBranch(branch: string): Promise<boolean>
  listFilesAtRef(ref: string, path: string): Promise<string[]>
  readFileAtRef(ref: string, path: string): Promise<string>
}

export function createGitRepository(projectDirectory: ProjectDirectory): GitRepository {
  return {
    getRemoteUrl: (): Promise<string> => getRemoteUrl(projectDirectory.getPath()),
    isHttpsRemote: (remoteUrl: string): boolean => remoteUrl.startsWith('https://'),
    hasLocalBranch: async (branch: string): Promise<boolean> => {
      try {
        await execFileAsync('git', ['show-ref', '--verify', '--quiet', `refs/heads/${branch}`], {
          cwd: projectDirectory.getPath(),
        })

        return true
      } catch {
        return false
      }
    },
    listFilesAtRef: (ref: string, path: string): Promise<string[]> =>
      listFilesAtRef(projectDirectory.getPath(), ref, path),
    readFileAtRef: (ref: string, path: string): Promise<string> =>
      readFileAtRef(projectDirectory.getPath(), ref, path),
  }
}

async function getRemoteUrl(cwd: string): Promise<string> {
  const { stdout } = await execFileAsync('git', ['remote', 'get-url', 'origin'], { cwd })

  return stdout.trim()
}

async function listFilesAtRef(cwd: string, ref: string, path: string): Promise<string[]> {
  const { stdout } = await execFileAsync('git', ['ls-tree', '-r', '--name-only', ref, '--', path], {
    cwd,
  })

  return stdout
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
}

async function readFileAtRef(cwd: string, ref: string, path: string): Promise<string> {
  const { stdout } = await execFileAsync('git', ['show', `${ref}:${path}`], { cwd })

  return stdout
}
