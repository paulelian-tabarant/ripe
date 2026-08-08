import type { SkillResponseBodyItem } from '@ripe/api/contracts/skills.js'
import {
  type ApiClient,
  createApiClient,
  type ProjectRegistrationResult,
  ServerInvalidRemoteUrlError,
} from '../infrastructure/api-client.js'
import type { CacheStore, RipeCache } from '../infrastructure/cache-store.js'
import type { GitRepository } from '../infrastructure/git-repository.js'
import type { ProjectDirectory } from '../infrastructure/project-directory.js'
import type { SettingsStore } from '../infrastructure/settings-store.js'

const MAIN_BRANCH = 'main'

export interface InitPrompter {
  promptForServerUrl(): Promise<string>
  promptAnotherServerUrl(): Promise<string>
  promptToConfirmServerUrl(existingUrl: string): Promise<boolean>
  promptForHttpsRemote(remoteUrl: string): Promise<string>
}

export type SkillSkipReason = 'namespaced' | 'malformed-frontmatter'

export interface InitPresenter {
  onInvalidServerUrl(url: string): void
  onProjectCreated(projectId: string): void
  onProjectAlreadyExisting(projectId: string): void
  onRemoteUrlError(detail?: string): void
  onServerRejectedRemoteUrl(remoteUrl: string, detail?: string): void
  onServerUnreachable(serverUrl: string, detail?: string): void
  onLocalStateWriteFailed(detail?: string): void
  onNoLocalMainBranch(): void
  onNoSkillsFound(): void
  onSkillSkipped(path: string, reason: SkillSkipReason): void
  onSkillRegistrationFailed(detail?: string): void
}

export interface InitOptions {
  projectDirectory: ProjectDirectory
  prompter: InitPrompter
  presenter: InitPresenter
  gitRepository: GitRepository
  settingsStore: SettingsStore
  cacheStore: CacheStore
}

export type CommandResult = 'success' | 'error'

export async function init(options: InitOptions): Promise<CommandResult> {
  const { projectDirectory, prompter, presenter, gitRepository, settingsStore, cacheStore } =
    options

  const existingCache = cacheStore.read()

  const gitRemoteUrl = await getOrAskForGitRemoteUrl(gitRepository, prompter, presenter)
  if (!gitRemoteUrl) return 'error'

  const serverUrl = await getOrAskForServerUrl(settingsStore, prompter, presenter)
  const apiClient = createApiClient(serverUrl)

  const projectRegistrationResult = await registerProjectToServer(apiClient, presenter, {
    name: projectDirectory.getName(),
    gitRemoteUrl,
  })

  if (!projectRegistrationResult) return 'error'

  if (projectRegistrationResult.wasAlreadyExisting) {
    presenter.onProjectAlreadyExisting(projectRegistrationResult.projectId)
  } else {
    presenter.onProjectCreated(projectRegistrationResult.projectId)
  }

  const wereProjectDataSaved = saveProjectDataLocally(settingsStore, cacheStore, presenter, {
    serverUrl: apiClient.getServerUrl(),
    projectId: projectRegistrationResult.projectId,
    skillIds: existingCache?.skillIds,
  })

  if (!wereProjectDataSaved) {
    return 'error'
  }

  const wereSkillsRegistered = await registerSkillsWithServer(
    gitRepository,
    apiClient,
    cacheStore,
    presenter,
    { projectId: projectRegistrationResult.projectId },
  )

  if (!wereSkillsRegistered) {
    return 'error'
  }

  return 'success'
}

async function getOrAskForGitRemoteUrl(
  gitRepository: GitRepository,
  prompter: InitPrompter,
  presenter: InitPresenter,
): Promise<string | undefined> {
  let rawRemoteUrl: string
  try {
    rawRemoteUrl = await gitRepository.getRemoteUrl()
  } catch (err) {
    presenter.onRemoteUrlError(err instanceof Error ? err.message : undefined)

    return undefined
  }

  if (gitRepository.isHttpsRemote(rawRemoteUrl)) return rawRemoteUrl

  return prompter.promptForHttpsRemote(rawRemoteUrl)
}

async function getOrAskForServerUrl(
  settingsStore: SettingsStore,
  prompter: InitPrompter,
  presenter: InitPresenter,
): Promise<string> {
  const existingSettings = settingsStore.read()

  if (existingSettings && (await prompter.promptToConfirmServerUrl(existingSettings.serverUrl))) {
    return existingSettings.serverUrl
  }

  let serverUrl = await prompter.promptForServerUrl()

  while (!isValidHttpUrl(serverUrl)) {
    presenter.onInvalidServerUrl(serverUrl)
    serverUrl = await prompter.promptAnotherServerUrl()
  }

  return serverUrl
}

async function registerProjectToServer(
  server: ApiClient,
  presenter: InitPresenter,
  project: {
    name: string
    gitRemoteUrl: string
  },
): Promise<ProjectRegistrationResult | undefined> {
  try {
    return await server.registerProject(project.name, project.gitRemoteUrl)
  } catch (err) {
    const detail = err instanceof Error ? err.message : undefined

    if (err instanceof ServerInvalidRemoteUrlError) {
      presenter.onServerRejectedRemoteUrl(project.gitRemoteUrl, detail)
    } else {
      presenter.onServerUnreachable(server.getServerUrl(), detail)
    }

    return undefined
  }
}

function saveProjectDataLocally(
  settingsStore: SettingsStore,
  cacheStore: CacheStore,
  presenter: InitPresenter,
  data: { serverUrl: string; projectId: string; skillIds: Record<string, string> | undefined },
): boolean {
  try {
    settingsStore.write({ serverUrl: data.serverUrl })
    cacheStore.write({ projectId: data.projectId, skillIds: data.skillIds })

    return true
  } catch (err) {
    presenter.onLocalStateWriteFailed(err instanceof Error ? err.message : undefined)

    return false
  }
}

function isValidHttpUrl(url: string): boolean {
  try {
    const parsed = new URL(url)

    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

async function registerSkillsWithServer(
  gitRepository: GitRepository,
  apiClient: ApiClient,
  cacheStore: CacheStore,
  presenter: InitPresenter,
  data: { projectId: string },
): Promise<boolean> {
  const hasMainBranch = await gitRepository.hasLocalBranch(MAIN_BRANCH)
  if (!hasMainBranch) {
    presenter.onNoLocalMainBranch()

    return false
  }

  const { names, skipped } = await scanSkillCatalogOnMain(gitRepository)
  for (const skill of skipped) presenter.onSkillSkipped(skill.path, skill.reason)

  if (names.length === 0) {
    presenter.onNoSkillsFound()

    return true
  }

  try {
    const registered = await apiClient.registerSkills(data.projectId, names)
    const skillIds = toSkillIdMap(registered)
    const cache: RipeCache = { projectId: data.projectId, skillIds }
    cacheStore.write(cache)

    return true
  } catch (err) {
    presenter.onSkillRegistrationFailed(err instanceof Error ? err.message : undefined)

    return false
  }
}

interface SkillFile {
  path: string
  content: string
}

interface SkillScanResult {
  names: string[]
  skipped: Array<{ path: string; reason: SkillSkipReason }>
}

async function scanSkillCatalogOnMain(gitRepository: GitRepository): Promise<SkillScanResult> {
  const skillFilePaths = await gitRepository.listSkillFilePaths(MAIN_BRANCH)

  const files = await Promise.all(
    skillFilePaths.map(
      async (path): Promise<SkillFile> => ({
        path,
        content: await gitRepository.readFileAtRef(MAIN_BRANCH, path),
      }),
    ),
  )

  return classifySkillFiles(files)
}

function classifySkillFiles(files: SkillFile[]): SkillScanResult {
  const names: string[] = []
  const skipped: SkillScanResult['skipped'] = []

  for (const file of files) {
    const name = extractSkillName(file.content)

    if (name === undefined) {
      skipped.push({ path: file.path, reason: 'malformed-frontmatter' })
      continue
    }

    if (name.includes(':')) {
      skipped.push({ path: file.path, reason: 'namespaced' })
      continue
    }

    names.push(name)
  }

  return { names, skipped }
}

function extractSkillName(content: string): string | undefined {
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/)
  if (!frontmatterMatch) return undefined

  const nameMatch = frontmatterMatch[1]?.match(/^name:\s*(.+)$/m)
  if (!nameMatch) return undefined

  const name = nameMatch[1]?.trim().replace(/^["']|["']$/g, '')

  return name && name.length > 0 ? name : undefined
}

function toSkillIdMap(registered: SkillResponseBodyItem[]): Record<string, string> {
  return Object.fromEntries(registered.map((skill) => [skill.name, skill.skillId]))
}
