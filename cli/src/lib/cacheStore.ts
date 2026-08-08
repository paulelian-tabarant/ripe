import { join } from 'node:path'
import type { ProjectDirectory } from './projectDirectory.js'
import { type RipeCache, writeCache } from './writeCache.js'

export type { RipeCache } from './writeCache.js'

export interface CacheStore {
  write(cache: RipeCache): void
}

export function createCacheStore(projectDirectory: ProjectDirectory): CacheStore {
  const cachePath = (): string => join(projectDirectory.getPath(), '.ripe/cache.json')

  return {
    write: (cache: RipeCache): void => writeCache(cachePath(), cache),
  }
}
