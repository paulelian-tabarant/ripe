import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import type { ProjectDirectory } from './project-directory.js'

const execFileAsync = promisify(execFile)

const SKILL_FILE_PATTERN = /^\.claude\/skills\/[^/]+\/SKILL\.md$/

export interface GitRepository {
  getRemoteUrl(): Promise<string>
  isHttpsRemote(remoteUrl: string): boolean
  hasLocalBranch(branch: string): Promise<boolean>
  listSkillFilePaths(ref: string): Promise<string[]>
  readFileAtRef(ref: string, path: string): Promise<string>
}

export function createGitRepository(projectDirectory: ProjectDirectory): GitRepository {
  return {
    getRemoteUrl: (): Promise<string> => getRemoteUrl(projectDirectory.getPath()),
    isHttpsRemote: (remoteUrl: string): boolean => remoteUrl.startsWith('https://'),
    hasLocalBranch: (branch: string): Promise<boolean> =>
      hasLocalBranch(projectDirectory.getPath(), branch),
    listSkillFilePaths: (ref: string): Promise<string[]> =>
      listSkillFilePaths(projectDirectory.getPath(), ref),
    readFileAtRef: (ref: string, path: string): Promise<string> =>
      readFileAtRef(projectDirectory.getPath(), ref, path),
  }
}

async function getRemoteUrl(cwd: string): Promise<string> {
  const { stdout } = await execFileAsync('git', ['remote', 'get-url', 'origin'], { cwd })

  return stdout.trim()
}

async function hasLocalBranch(cwd: string, branch: string): Promise<boolean> {
  try {
    await execFileAsync('git', ['show-ref', '--verify', '--quiet', `refs/heads/${branch}`], {
      cwd,
    })

    return true
  } catch {
    return false
  }
}

async function listSkillFilePaths(cwd: string, ref: string): Promise<string[]> {
  const { stdout } = await execFileAsync(
    'git',
    ['ls-tree', '-r', '--name-only', ref, '--', '.claude/skills'],
    { cwd },
  )

  return stdout
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => SKILL_FILE_PATTERN.test(line))
}

async function readFileAtRef(cwd: string, ref: string, path: string): Promise<string> {
  const { stdout } = await execFileAsync('git', ['show', `${ref}:${path}`], { cwd })

  return stdout
}
