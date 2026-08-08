import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import type { ProjectDirectory } from './project-directory.js'

export interface Cache {
  projectId: string
  skillIdByName?: Record<string, string>
}

export interface CacheStore {
  read(): Cache | undefined
  write(cache: Cache): void
}

export function createCacheStore(projectDirectory: ProjectDirectory): CacheStore {
  const cachePath = (): string => join(projectDirectory.getPath(), '.ripe/cache.json')

  return {
    read: (): Cache | undefined => readCache(cachePath()),
    write: (cache: Cache): void => writeCache(cachePath(), cache),
  }
}

function isValidCache(value: unknown): value is Cache {
  if (typeof value !== 'object' || value === null) return false

  const cache = value as Record<string, unknown>

  return typeof cache.projectId === 'string' && cache.projectId.length > 0
}

function readCache(cachePath: string): Cache | undefined {
  if (!existsSync(cachePath)) return undefined

  let parsed: unknown
  try {
    parsed = JSON.parse(readFileSync(cachePath, 'utf-8'))
  } catch {
    return undefined
  }

  return isValidCache(parsed) ? parsed : undefined
}

function writeCache(cachePath: string, cache: Cache): void {
  mkdirSync(dirname(cachePath), { recursive: true })
  writeFileSync(cachePath, `${JSON.stringify(cache, null, 2)}\n`, 'utf-8')
}
