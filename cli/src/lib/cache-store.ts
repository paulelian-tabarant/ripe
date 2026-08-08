import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import type { ProjectDirectory } from './project-directory.js'

export interface RipeCache {
  projectId: string
}

export interface CacheStore {
  write(cache: RipeCache): void
}

export function createCacheStore(projectDirectory: ProjectDirectory): CacheStore {
  const cachePath = (): string => join(projectDirectory.getPath(), '.ripe/cache.json')

  return {
    write: (cache: RipeCache): void => writeCache(cachePath(), cache),
  }
}

function writeCache(cachePath: string, cache: RipeCache): void {
  mkdirSync(dirname(cachePath), { recursive: true })
  writeFileSync(cachePath, `${JSON.stringify(cache, null, 2)}\n`, 'utf-8')
}
