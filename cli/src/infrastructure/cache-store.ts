import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import type { ProjectDirectory } from './project-directory.js'

export interface RipeCache {
  projectId: string
  skillIds?: Record<string, string>
}

export interface CacheStore {
  read(): RipeCache | undefined
  write(cache: RipeCache): void
}

export function createCacheStore(projectDirectory: ProjectDirectory): CacheStore {
  const cachePath = (): string => join(projectDirectory.getPath(), '.ripe/cache.json')

  return {
    read: (): RipeCache | undefined => readCache(cachePath()),
    write: (cache: RipeCache): void => writeCache(cachePath(), cache),
  }
}

function isValidRipeCache(value: unknown): value is RipeCache {
  if (typeof value !== 'object' || value === null) return false

  const cache = value as Record<string, unknown>

  return typeof cache.projectId === 'string' && cache.projectId.length > 0
}

function readCache(cachePath: string): RipeCache | undefined {
  if (!existsSync(cachePath)) return undefined

  let parsed: unknown
  try {
    parsed = JSON.parse(readFileSync(cachePath, 'utf-8'))
  } catch {
    return undefined
  }

  return isValidRipeCache(parsed) ? parsed : undefined
}

function writeCache(cachePath: string, cache: RipeCache): void {
  mkdirSync(dirname(cachePath), { recursive: true })
  writeFileSync(cachePath, `${JSON.stringify(cache, null, 2)}\n`, 'utf-8')
}
