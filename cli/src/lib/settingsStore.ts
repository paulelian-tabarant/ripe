import { join } from 'node:path'
import type { ProjectDirectory } from './projectDirectory.js'
import { readSettings } from './readSettings.js'
import { type RipeSettings, writeSettings } from './writeSettings.js'

export type { RipeSettings } from './writeSettings.js'

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
