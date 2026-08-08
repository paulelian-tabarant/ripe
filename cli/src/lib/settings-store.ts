import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import type { ProjectDirectory } from './projectDirectory.js'

export interface RipeSettings {
  serverUrl: string
}

export interface SettingsStore {
  read(): RipeSettings | undefined
  write(settings: RipeSettings): void
}

export function createSettingsStore(projectDirectory: ProjectDirectory): SettingsStore {
  const settingsPath = (): string => join(projectDirectory.getPath(), '.ripe/settings.json')

  return {
    read: (): RipeSettings | undefined => readSettings(settingsPath()),
    write: (settings: RipeSettings): void => writeSettings(settingsPath(), settings),
  }
}

function isValidRipeSettings(value: unknown): value is RipeSettings {
  if (typeof value !== 'object' || value === null) return false

  const settings = value as Record<string, unknown>

  return typeof settings.serverUrl === 'string' && settings.serverUrl.length > 0
}

function readSettings(settingsPath: string): RipeSettings | undefined {
  if (!existsSync(settingsPath)) return undefined

  let parsed: unknown
  try {
    parsed = JSON.parse(readFileSync(settingsPath, 'utf-8'))
  } catch {
    return undefined
  }

  return isValidRipeSettings(parsed) ? parsed : undefined
}

function writeSettings(settingsPath: string, settings: RipeSettings): void {
  mkdirSync(dirname(settingsPath), { recursive: true })
  writeFileSync(settingsPath, `${JSON.stringify(settings, null, 2)}\n`, 'utf-8')
}
