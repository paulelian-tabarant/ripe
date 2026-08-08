import { join } from 'node:path'
import { readSettings } from './readSettings.js'
import { type RipeSettings, writeSettings } from './writeSettings.js'

export type { RipeSettings } from './writeSettings.js'

export interface SettingsStore {
  read(): RipeSettings | undefined
  write(settings: RipeSettings): void
}

export function createSettingsStore(getCurrentDirectoryName: () => string): SettingsStore {
  const settingsPath = (): string => join(getCurrentDirectoryName(), '.ripe/settings.json')

  return {
    read: (): RipeSettings | undefined => readSettings(settingsPath()),
    write: (settings: RipeSettings): void => writeSettings(settingsPath(), settings),
  }
}
