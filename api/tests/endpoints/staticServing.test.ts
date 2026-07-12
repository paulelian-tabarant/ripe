import path from 'node:path'
import { fileURLToPath } from 'node:url'
import Database from 'better-sqlite3'
import type { FastifyInstance } from 'fastify'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { buildApp } from '../../src/app.js'

const FIXTURE_STATIC_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../fixtures/static-root',
)

describe('static file serving', () => {
  let app: FastifyInstance

  beforeEach(() => {
    const db = new Database(':memory:')
    app = buildApp(db, { logger: false, staticRoot: FIXTURE_STATIC_ROOT })
  })

  afterEach(async () => {
    await app.close()
  })

  it('serves a static asset that exists under the static root', async () => {
    const response = await app.inject({ method: 'GET', url: '/assets/hello.txt' })

    expect(response.statusCode).toBe(200)
    expect(response.body).toBe('fixture asset\n')
  })

  it('falls back to index.html for a non-/api route with no matching static file', async () => {
    const response = await app.inject({ method: 'GET', url: '/some/client/route' })

    expect(response.statusCode).toBe(200)
    expect(response.headers['content-type']).toContain('text/html')
    expect(response.body).toContain('fixture index')
  })

  it('does not fall back to index.html for an unmatched /api route', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/does-not-exist' })

    expect(response.statusCode).toBe(404)
    expect(response.body).not.toContain('fixture index')
  })
})
