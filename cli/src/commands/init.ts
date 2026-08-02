import { basename, join } from 'node:path'
import { createInterface } from 'node:readline/promises'
import { getRemoteUrl } from '../lib/getRemoteUrl.js'
import { readConfig } from '../lib/readConfig.js'
import {
  type ProjectRegistrationResult,
  registerProject,
  ServerRejectedRemoteError,
} from '../lib/registerProject.js'
import { writeConfig } from '../lib/writeConfig.js'

export interface InitOptions {
  currentDirectoryName?: string
  urlPromptFn?: () => Promise<string>
  promptFn?: (question: string) => Promise<boolean>
  httpsRemotePromptFn?: (remoteUrl: string) => Promise<string>
}

export interface InitResult {
  status: 'success' | 'error'
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
    if (err instanceof ServerRejectedRemoteError) {
      console.error(`Error: the server rejected this remote URL: "${remoteUrl}"`)
    } else {
      console.error(`Error: could not reach server at ${serverUrl}`)
    }

    if (err instanceof Error) console.error(err.message)

    return undefined
  }
}

async function defaultPromptFn(question: string): Promise<boolean> {
  const answer = await ask(question)

  return answer.toLowerCase() === 'y'
}

function isValidHttpUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

export async function init(options: InitOptions = {}): Promise<InitResult> {
  const currentDirectoryName = options.currentDirectoryName ?? process.cwd()
  const urlPromptFn = options.urlPromptFn ?? defaultUrlPromptFn
  const promptFn = options.promptFn ?? defaultPromptFn
  const httpsRemotePromptFn = options.httpsRemotePromptFn ?? defaultHttpsRemotePromptFn
  const configPath = join(currentDirectoryName, '.ripe/config.json')

  const existing = readConfig(configPath)
  if (existing) {
    console.warn(
      `.ripe/config.json already exists — project already registered as ${existing.projectId}.`,
    )

    return { status: 'success' }
  }

  const rawRemoteUrl = await readRemoteUrl(currentDirectoryName)
  if (!rawRemoteUrl) return { status: 'error' }

  const remoteUrl = await resolveHttpsRemoteUrl(rawRemoteUrl, httpsRemotePromptFn)

  let serverUrl: string
  while (true) {
    serverUrl = await urlPromptFn()
    if (isValidHttpUrl(serverUrl)) break
    console.error(`Invalid server URL: "${serverUrl}". Must be a valid http or https URL.`)
  }

  const defaultProjectName = basename(currentDirectoryName)

  const result = await tryRegisterProject(serverUrl, defaultProjectName, remoteUrl)
  if (!result) return { status: 'error' }

  let message: string

  if (result.created) {
    message = `Project registered: ${result.projectId}`
  } else {
    const useExisting = await promptFn(
      `A project named '${defaultProjectName}' is already registered on this server. Attach to it? (y/n) `,
    )

    if (!useExisting) return { status: 'success' }

    message = `Using existing project ID: ${result.projectId}`
  }

  writeConfig(configPath, { projectId: result.projectId, serverUrl })
  console.log(message)

  return { status: 'success' }
}
