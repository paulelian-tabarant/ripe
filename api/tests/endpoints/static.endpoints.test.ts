import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type Database from 'better-sqlite3'
import type { FastifyInstance } from 'fastify'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { buildApp } from '../../src/app.js'
import { createTestDb } from '../helpers/create-test-db.js'

describe('static frontend serving', () => {
  let app: FastifyInstance
  let db: Database.Database
  let tmpDir: string

  beforeEach(() => {
    db = createTestDb()
  })

  afterEach(async () => {
    if (app) await app.close()
    if (tmpDir) rmSync(tmpDir, { recursive: true, force: true })
  })

  it('returns a normal 404 for an unmatched path when disabled', async () => {
    app = buildApp(db, { logger: false })

    const response = await app.inject({ method: 'GET', url: '/some/unmatched/path' })

    expect(response.statusCode).toBe(404)
  })

  it('serves index.html for unmatched non-api routes without shadowing /api', async () => {
    tmpDir = writeFixtureFrontend()
    app = buildApp(db, { logger: false, shouldServeBuiltFrontend: true, staticDir: tmpDir })

    const rootResponse = await app.inject({ method: 'GET', url: '/' })
    const deepLinkResponse = await app.inject({ method: 'GET', url: '/some/client/route' })
    const healthResponse = await app.inject({ method: 'GET', url: '/api/health' })
    const missingApiResponse = await app.inject({ method: 'GET', url: '/api/does-not-exist' })

    expect(rootResponse.statusCode).toBe(200)
    expect(rootResponse.body).toContain('<title>fixture</title>')
    expect(deepLinkResponse.statusCode).toBe(200)
    expect(deepLinkResponse.body).toContain('<title>fixture</title>')
    expect(healthResponse.statusCode).toBe(200)
    expect(healthResponse.json()).toEqual({ status: 'ok' })
    expect(missingApiResponse.statusCode).toBe(404)
  })

  it('serves index.html for a path that merely starts with "api" but is not /api/*', async () => {
    tmpDir = writeFixtureFrontend()
    app = buildApp(db, { logger: false, shouldServeBuiltFrontend: true, staticDir: tmpDir })

    const response = await app.inject({ method: 'GET', url: '/apiary' })

    expect(response.statusCode).toBe(200)
    expect(response.body).toContain('<title>fixture</title>')
  })

  it.each([
    ['does not exist', (): string => join(tmpdir(), 'ripe-test-does-not-exist')],
    ['is empty', (): string => (tmpDir = mkdtempSync(join(tmpdir(), 'ripe-test-')))],
  ])('throws on startup when staticDir %s', (_description, makeStaticDir) => {
    const staticDir = makeStaticDir()

    expect(() =>
      buildApp(db, { logger: false, shouldServeBuiltFrontend: true, staticDir }),
    ).toThrow()
  })

  function writeFixtureFrontend(): string {
    const dir = mkdtempSync(join(tmpdir(), 'ripe-test-'))
    writeFileSync(join(dir, 'index.html'), '<html><head><title>fixture</title></head></html>')
    return dir
  }
})
