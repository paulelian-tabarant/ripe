import Database from 'better-sqlite3'
import { afterEach, describe, expect, it } from 'vitest'
import { buildApp } from '../../src/app.js'

describe('GET /api/health', () => {
  let app: ReturnType<typeof buildApp>

  afterEach(async () => {
    await app.close()
  })

  it('returns 200 with status ok', async () => {
    const db = new Database(':memory:')
    app = buildApp(db, { logger: false })

    const response = await app.inject({ method: 'GET', url: '/api/health' })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ status: 'ok' })
  })
})
