import { type RipeCache, writeCache } from './writeCache.js'

export type { RipeCache } from './writeCache.js'

export interface CacheStore {
  write(cache: RipeCache): void
}

export function createCacheStore(cachePath: string): CacheStore {
  return {
    write: (cache: RipeCache): void => writeCache(cachePath, cache),
  }
}
