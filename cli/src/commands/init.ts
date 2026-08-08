import {
  type ApiClient,
  createApiClient,
  type ProjectRegistrationResult,
  ServerInvalidRemoteUrlError,
} from '@/infrastructure/api-client.js'
import type { CacheStore } from '@/infrastructure/cache-store.js'
import type { GitRepository } from '@/infrastructure/git-repository.js'
import type { ProjectDirectory } from '@/infrastructure/project-directory.js'
import type { SettingsStore } from '@/infrastructure/settings-store.js'

export interface InitPrompter {
  promptForServerUrl(): Promise<string>
  promptAnotherServerUrl(): Promise<string>
  promptToConfirmServerUrl(existingUrl: string): Promise<boolean>
  promptForHttpsRemote(remoteUrl: string): Promise<string>
}

export interface InitPresenter {
  onInvalidServerUrl(url: string): void
  onProjectCreated(projectId: string): void
  onProjectAlreadyExisting(projectId: string): void
  onRemoteUrlError(detail?: string): void
  onServerRejectedRemoteUrl(remoteUrl: string, detail?: string): void
  onServerUnreachable(serverUrl: string, detail?: string): void
  onLocalStateWriteFailed(detail?: string): void
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
  })

  if (!wereProjectDataSaved) {
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
  data: { serverUrl: string; projectId: string },
): boolean {
  try {
    settingsStore.write({ serverUrl: data.serverUrl })
    cacheStore.write({ projectId: data.projectId })

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
