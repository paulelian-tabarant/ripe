import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

export interface RipeCache {
  projectId: string
}

export function writeCache(cachePath: string, cache: RipeCache): void {
  mkdirSync(dirname(cachePath), { recursive: true })
  writeFileSync(cachePath, `${JSON.stringify(cache, null, 2)}\n`, 'utf-8')
}
