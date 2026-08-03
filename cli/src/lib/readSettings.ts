import { existsSync, readFileSync } from 'node:fs'
import type { RipeSettings } from './writeSettings.js'

function isValidRipeSettings(value: unknown): value is RipeSettings {
  if (typeof value !== 'object' || value === null) return false

  const settings = value as Record<string, unknown>

  return typeof settings.serverUrl === 'string' && settings.serverUrl.length > 0
}

export function readSettings(settingsPath: string): RipeSettings | undefined {
  if (!existsSync(settingsPath)) return undefined

  let parsed: unknown
  try {
    parsed = JSON.parse(readFileSync(settingsPath, 'utf-8'))
  } catch {
    return undefined
  }

  return isValidRipeSettings(parsed) ? parsed : undefined
}
