import type { CacheStore } from '../lib/cache-store.js'
import type { GitRepository } from '../lib/git-repository.js'
import type { ProjectDirectory } from '../lib/project-directory.js'
import {
  createServer,
  type ProjectRegistrationResult,
  type Server,
  ServerInvalidRemoteUrlError,
} from '../lib/server.js'
import type { SettingsStore } from '../lib/settings-store.js'

export interface InitPrompter {
  promptForServerUrl(): Promise<string>
  promptAnotherServerUrl(): Promise<string>
  promptToConfirmServerUrl(existingUrl: string): Promise<boolean>
  promptForHttpsRemote(remoteUrl: string): Promise<string>
}

export interface InitPresenter {
  onInvalidServerUrl(url: string): void
  onProjectRegistered(result: ProjectRegistrationResult): void
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

  const remoteUrl = await resolveRemoteUrl(gitRepository, prompter, presenter)
  if (!remoteUrl) return 'error'

  const serverUrl = await resolveServerUrl(settingsStore, prompter, presenter)
  const defaultProjectName = projectDirectory.getName()
  const server = createServer(serverUrl)

  const result = await tryRegisterProject(server, defaultProjectName, remoteUrl, presenter)
  if (!result) return 'error'

  presenter.onProjectRegistered(result)

  if (!tryPersistProjectData(settingsStore, cacheStore, server, result.projectId, presenter)) {
    return 'error'
  }

  return 'success'
}

async function resolveRemoteUrl(
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

async function resolveServerUrl(
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

async function tryRegisterProject(
  server: Server,
  name: string,
  remoteUrl: string,
  presenter: InitPresenter,
): Promise<ProjectRegistrationResult | undefined> {
  try {
    return await server.registerProject(name, remoteUrl)
  } catch (err) {
    const detail = err instanceof Error ? err.message : undefined

    if (err instanceof ServerInvalidRemoteUrlError) {
      presenter.onServerRejectedRemoteUrl(remoteUrl, detail)
    } else {
      presenter.onServerUnreachable(server.getUrl(), detail)
    }

    return undefined
  }
}

function tryPersistProjectData(
  settingsStore: SettingsStore,
  cacheStore: CacheStore,
  server: Server,
  projectId: string,
  presenter: InitPresenter,
): boolean {
  try {
    settingsStore.write({ serverUrl: server.getUrl() })
    cacheStore.write({ projectId })

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
