import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

export interface RipeSettings {
  serverUrl: string
}

export function writeSettings(settingsPath: string, settings: RipeSettings): void {
  mkdirSync(dirname(settingsPath), { recursive: true })
  writeFileSync(settingsPath, `${JSON.stringify(settings, null, 2)}\n`, 'utf-8')
}
