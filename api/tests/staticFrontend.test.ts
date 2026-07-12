import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import Database from 'better-sqlite3'
import type { FastifyInstance } from 'fastify'
import { afterEach, describe, expect, it } from 'vitest'
import { buildApp } from '../src/app.js'

describe('static frontend serving', () => {
  let app: FastifyInstance
  let tmpDir: string

  afterEach(async () => {
    if (app) await app.close()
    if (tmpDir) rmSync(tmpDir, { recursive: true, force: true })
  })

  it('returns a normal 404 for an unmatched path when disabled', async () => {
    const db = new Database(':memory:')
    app = buildApp(db, { logger: false })

    const response = await app.inject({ method: 'GET', url: '/some/unmatched/path' })

    expect(response.statusCode).toBe(404)
  })

  it('serves index.html for unmatched non-api routes without shadowing /api', async () => {
    tmpDir = writeFixtureFrontend()
    const db = new Database(':memory:')
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
    const db = new Database(':memory:')
    app = buildApp(db, { logger: false, shouldServeBuiltFrontend: true, staticDir: tmpDir })

    const response = await app.inject({ method: 'GET', url: '/apiary' })

    expect(response.statusCode).toBe(200)
    expect(response.body).toContain('<title>fixture</title>')
  })

  it('throws on startup when staticDir does not exist', () => {
    const db = new Database(':memory:')
    const missingDir = join(tmpdir(), 'ripe-test-does-not-exist')

    expect(() =>
      buildApp(db, { logger: false, shouldServeBuiltFrontend: true, staticDir: missingDir }),
    ).toThrow()
  })

  it('throws on startup when staticDir is empty', () => {
    tmpDir = mkdtempSync(join(tmpdir(), 'ripe-test-'))
    const db = new Database(':memory:')

    expect(() =>
      buildApp(db, { logger: false, shouldServeBuiltFrontend: true, staticDir: tmpDir }),
    ).toThrow()
  })

  function writeFixtureFrontend(): string {
    const dir = mkdtempSync(join(tmpdir(), 'ripe-test-'))
    writeFileSync(join(dir, 'index.html'), '<html><head><title>fixture</title></head></html>')
    return dir
  }
})
