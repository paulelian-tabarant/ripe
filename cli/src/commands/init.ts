import { basename, join } from 'node:path'
import { getRemoteUrl } from '../lib/getRemoteUrl.js'
import { readSettings } from '../lib/readSettings.js'
import {
  type ProjectRegistrationResult,
  registerProject,
  ServerInvalidRemoteUrlError,
} from '../lib/registerProject.js'
import { writeCache } from '../lib/writeCache.js'
import { writeSettings } from '../lib/writeSettings.js'

export interface InitPrompts {
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
  getCurrentDirectoryName: () => string
  prompts: InitPrompts
  presenter: InitPresenter
}

export interface InitResult {
  status: 'success' | 'error'
}

export async function init(options: InitOptions): Promise<InitResult> {
  const { getCurrentDirectoryName, prompts, presenter } = options
  const currentDirectoryName = getCurrentDirectoryName()
  const settingsPath = join(currentDirectoryName, '.ripe/settings.json')
  const cachePath = join(currentDirectoryName, '.ripe/cache.json')

  const rawRemoteUrl = await readRemoteUrl(currentDirectoryName, presenter)
  if (!rawRemoteUrl) return { status: 'error' }

  const remoteUrl = await resolveHttpsRemoteUrl(rawRemoteUrl, prompts)
  const serverUrl = await resolveServerUrl(settingsPath, prompts, presenter)
  const defaultProjectName = basename(currentDirectoryName)

  const result = await tryRegisterProject(serverUrl, defaultProjectName, remoteUrl, presenter)
  if (!result) return { status: 'error' }

  presenter.onProjectRegistered(result)

  if (!tryWriteLocalState(settingsPath, cachePath, serverUrl, result.projectId, presenter)) {
    return { status: 'error' }
  }

  return { status: 'success' }
}

function tryWriteLocalState(
  settingsPath: string,
  cachePath: string,
  serverUrl: string,
  projectId: string,
  presenter: InitPresenter,
): boolean {
  try {
    writeSettings(settingsPath, { serverUrl })
    writeCache(cachePath, { projectId })

    return true
  } catch (err) {
    presenter.onLocalStateWriteFailed(err instanceof Error ? err.message : undefined)

    return false
  }
}

async function resolveServerUrl(
  settingsPath: string,
  prompts: InitPrompts,
  presenter: InitPresenter,
): Promise<string> {
  const existingSettings = readSettings(settingsPath)
  if (existingSettings && (await prompts.promptToConfirmServerUrl(existingSettings.serverUrl))) {
    return existingSettings.serverUrl
  }

  let serverUrl = await prompts.promptForServerUrl()
  while (!isValidHttpUrl(serverUrl)) {
    presenter.onInvalidServerUrl(serverUrl)
    serverUrl = await prompts.promptAnotherServerUrl()
  }

  return serverUrl
}

async function readRemoteUrl(cwd: string, presenter: InitPresenter): Promise<string | undefined> {
  try {
    return await getRemoteUrl(cwd)
  } catch (err) {
    presenter.onRemoteUrlError(err instanceof Error ? err.message : undefined)

    return undefined
  }
}

async function resolveHttpsRemoteUrl(rawRemoteUrl: string, prompts: InitPrompts): Promise<string> {
  if (rawRemoteUrl.startsWith('https://')) return rawRemoteUrl

  return prompts.promptForHttpsRemote(rawRemoteUrl)
}

async function tryRegisterProject(
  serverUrl: string,
  name: string,
  remoteUrl: string,
  presenter: InitPresenter,
): Promise<ProjectRegistrationResult | undefined> {
  try {
    return await registerProject(serverUrl, name, remoteUrl)
  } catch (err) {
    const detail = err instanceof Error ? err.message : undefined

    if (err instanceof ServerInvalidRemoteUrlError) {
      presenter.onServerRejectedRemoteUrl(remoteUrl, detail)
    } else {
      presenter.onServerUnreachable(serverUrl, detail)
    }

    return undefined
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
