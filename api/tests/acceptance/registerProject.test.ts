import Database from 'better-sqlite3'
import type { FastifyInstance } from 'fastify'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { buildApp } from '../../src/app.js'
import { prepareAndBindPostProjectsRequestTo } from '../helpers/postProjects.js'

describe('POST /api/projects', () => {
  let app: FastifyInstance
  let postProjects: ReturnType<typeof prepareAndBindPostProjectsRequestTo>

  beforeEach(() => {
    const db = new Database(':memory:')
    app = buildApp(db, { logger: false })
    postProjects = prepareAndBindPostProjectsRequestTo(app)
  })

  afterEach(async () => {
    await app.close()
  })

  it('returns 201 with projectId for a new project', async () => {
    const response = await postProjects({ name: 'my-project' })

    expect(response.statusCode).toBe(201)
    expect(response.json().projectId).toMatch(/^proj_/)
  })

  it('returns 409 with existing projectId for a duplicate name', async () => {
    const first = await postProjects({ name: 'my-project' })
    const second = await postProjects({ name: 'my-project' })

    expect(second.statusCode).toBe(409)
    expect(second.json().projectId).toBe(first.json().projectId)
  })

  it('returns 400 for a missing name field', async () => {
    const response = await postProjects({})

    expect(response.statusCode).toBe(400)
  })

  it('returns 400 for an empty name string', async () => {
    const response = await postProjects({ name: '' })

    expect(response.statusCode).toBe(400)
  })
})
