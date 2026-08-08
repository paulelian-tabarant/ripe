import { join } from 'node:path'
import { type RipeCache, writeCache } from './writeCache.js'

export type { RipeCache } from './writeCache.js'

export interface CacheStore {
  write(cache: RipeCache): void
}

export function createCacheStore(getCurrentDirectoryName: () => string): CacheStore {
  const cachePath = (): string => join(getCurrentDirectoryName(), '.ripe/cache.json')

  return {
    write: (cache: RipeCache): void => writeCache(cachePath(), cache),
  }
}
