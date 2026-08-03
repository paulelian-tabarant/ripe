import { basename, join } from 'node:path'
import { createInterface } from 'node:readline/promises'
import { getRemoteUrl } from '../lib/getRemoteUrl.js'
import { readSettings } from '../lib/readSettings.js'
import {
  type ProjectRegistrationResult,
  registerProject,
  ServerInvalidRemoteUrlError,
} from '../lib/registerProject.js'
import { writeCache } from '../lib/writeCache.js'
import { writeSettings } from '../lib/writeSettings.js'

export interface InitOptions {
  currentDirectoryName?: string
  urlPromptFn?: () => Promise<string>
  confirmServerUrlPromptFn?: (existingUrl: string) => Promise<boolean>
  httpsRemotePromptFn?: (remoteUrl: string) => Promise<string>
}

export interface InitResult {
  status: 'success' | 'error'
}

export async function init(options: InitOptions = {}): Promise<InitResult> {
  const currentDirectoryName = options.currentDirectoryName ?? process.cwd()
  const urlPromptFn = options.urlPromptFn ?? defaultUrlPromptFn
  const confirmServerUrlPromptFn =
    options.confirmServerUrlPromptFn ?? defaultConfirmServerUrlPromptFn
  const httpsRemotePromptFn = options.httpsRemotePromptFn ?? defaultHttpsRemotePromptFn
  const settingsPath = join(currentDirectoryName, '.ripe/settings.json')
  const cachePath = join(currentDirectoryName, '.ripe/cache.json')

  const rawRemoteUrl = await readRemoteUrl(currentDirectoryName)
  if (!rawRemoteUrl) return { status: 'error' }

  const remoteUrl = await resolveHttpsRemoteUrl(rawRemoteUrl, httpsRemotePromptFn)

  const serverUrl = await resolveServerUrl(settingsPath, urlPromptFn, confirmServerUrlPromptFn)

  const defaultProjectName = basename(currentDirectoryName)

  const result = await tryRegisterProject(serverUrl, defaultProjectName, remoteUrl)
  if (!result) return { status: 'error' }

  const message = result.created
    ? `Project registered: ${result.projectId}`
    : `Using existing project ID: ${result.projectId}`

  if (!tryWriteLocalState(settingsPath, cachePath, serverUrl, result.projectId)) {
    return { status: 'error' }
  }

  console.log(message)

  return { status: 'success' }
}

function tryWriteLocalState(
  settingsPath: string,
  cachePath: string,
  serverUrl: string,
  projectId: string,
): boolean {
  try {
    writeSettings(settingsPath, { serverUrl })
    writeCache(cachePath, { projectId })

    return true
  } catch (err) {
    console.error(
      'Error: registered successfully, but failed to save local state — run ripe init again to retry.',
    )

    if (err instanceof Error) console.error(err.message)

    return false
  }
}

async function resolveServerUrl(
  settingsPath: string,
  urlPromptFn: () => Promise<string>,
  confirmServerUrlPromptFn: (existingUrl: string) => Promise<boolean>,
): Promise<string> {
  const existingSettings = readSettings(settingsPath)
  if (existingSettings && (await confirmServerUrlPromptFn(existingSettings.serverUrl))) {
    return existingSettings.serverUrl
  }

  let serverUrl: string
  while (true) {
    serverUrl = await urlPromptFn()
    if (isValidHttpUrl(serverUrl)) break
    console.error(`Invalid server URL: "${serverUrl}". Must be a valid http or https URL.`)
  }

  return serverUrl
}

async function readRemoteUrl(cwd: string): Promise<string | undefined> {
  try {
    return await getRemoteUrl(cwd)
  } catch (err) {
    console.error('Error: could not determine the git remote URL for this directory')

    if (err instanceof Error) console.error(err.message)

    return undefined
  }
}

async function resolveHttpsRemoteUrl(
  rawRemoteUrl: string,
  httpsRemotePromptFn: (remoteUrl: string) => Promise<string>,
): Promise<string> {
  if (rawRemoteUrl.startsWith('https://')) return rawRemoteUrl

  return httpsRemotePromptFn(rawRemoteUrl)
}

async function tryRegisterProject(
  serverUrl: string,
  name: string,
  remoteUrl: string,
): Promise<ProjectRegistrationResult | undefined> {
  try {
    return await registerProject(serverUrl, name, remoteUrl)
  } catch (err) {
    if (err instanceof ServerInvalidRemoteUrlError) {
      console.error(`Error: the server rejected this remote URL: "${remoteUrl}"`)
    } else {
      console.error(`Error: could not reach server at ${serverUrl}`)
    }

    if (err instanceof Error) console.error(err.message)

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

async function ask(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  try {
    return await rl.question(question)
  } finally {
    rl.close()
  }
}

async function defaultUrlPromptFn(): Promise<string> {
  return ask('Server URL: ')
}

async function defaultHttpsRemotePromptFn(remoteUrl: string): Promise<string> {
  return ask(`Your git remote ("${remoteUrl}") isn't HTTPS. Enter the HTTPS URL for this repo: `)
}

async function defaultConfirmServerUrlPromptFn(existingUrl: string): Promise<boolean> {
  const answer = await ask(`Found existing server URL: "${existingUrl}". Keep it? (y/n) `)

  return answer.toLowerCase() === 'y'
}
