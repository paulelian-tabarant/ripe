import type Database from 'better-sqlite3'
import type { FastifyInstance, LightMyRequestResponse } from 'fastify'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { buildApp } from '../../src/app.js'
import { createTestDb } from '../helpers/create-test-db.js'
import { prepareAndBindPostProjectsRequestTo } from '../helpers/post-projects.js'

describe('GET /api/projects', () => {
  let app: FastifyInstance
  let postProjects: ReturnType<typeof prepareAndBindPostProjectsRequestTo>

  beforeEach(() => {
    const db = createTestDb()
    app = buildApp(db, { logger: false })
    postProjects = prepareAndBindPostProjectsRequestTo(app)
  })

  afterEach(async () => {
    await app.close()
  })

  it('returns 200 with an empty array when no projects are registered', async () => {
    const response = await getProjects()

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual([])
  })

  it('returns 200 with all registered projects', async () => {
    const first = await postProjects({
      name: 'my-project',
      remoteUrl: 'https://github.com/org/repo-one.git',
    })
    const second = await postProjects({
      name: 'other-project',
      remoteUrl: 'https://github.com/org/repo-two.git',
    })

    const response = await getProjects()

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual([
      { id: first.json().projectId, name: 'my-project' },
      { id: second.json().projectId, name: 'other-project' },
    ])
  })

  async function getProjects(): Promise<LightMyRequestResponse> {
    return await app.inject({ method: 'GET', url: '/api/projects' })
  }
})

describe('POST /api/projects', () => {
  let db: Database.Database
  let app: FastifyInstance
  let postProjects: ReturnType<typeof prepareAndBindPostProjectsRequestTo>

  beforeEach(() => {
    db = createTestDb()
    app = buildApp(db, { logger: false })
    postProjects = prepareAndBindPostProjectsRequestTo(app)
  })

  afterEach(async () => {
    await app.close()
  })

  it('returns 201 with projectId for a fresh remoteUrl', async () => {
    const response = await postProjects({
      name: 'my-project',
      remoteUrl: 'https://github.com/org/repo.git',
    })

    expect(response.statusCode).toBe(201)
    expect(response.json().projectId).toMatch(/^proj_/)
  })

  it('returns 200 with the same projectId for a repeat of an equivalent remoteUrl', async () => {
    const first = await postProjects({
      name: 'my-project',
      remoteUrl: 'https://github.com/org/repo.git',
    })
    const second = await postProjects({
      name: 'my-project',
      remoteUrl: 'https://github.com/org/repo.git',
    })

    expect(second.statusCode).toBe(200)
    expect(second.json().projectId).toBe(first.json().projectId)
  })

  it('returns distinct projectIds for two different remoteUrls sharing the same name', async () => {
    const first = await postProjects({
      name: 'my-project',
      remoteUrl: 'https://github.com/org/repo-one.git',
    })
    const second = await postProjects({
      name: 'my-project',
      remoteUrl: 'https://github.com/org/repo-two.git',
    })

    expect(first.statusCode).toBe(201)
    expect(second.statusCode).toBe(201)
    expect(second.json().projectId).not.toBe(first.json().projectId)
  })

  it.each([
    ['a missing remoteUrl field', { name: 'my-project' }],
    ['a missing name field', { remoteUrl: 'https://github.com/org/repo.git' }],
    ['an empty name string', { name: '', remoteUrl: 'https://github.com/org/repo.git' }],
    ['an unparseable remoteUrl', { name: 'my-project', remoteUrl: 'not a url' }],
    ['an empty remoteUrl', { name: 'my-project', remoteUrl: '' }],
    ['a non-https remoteUrl', { name: 'my-project', remoteUrl: 'git@github.com:org/repo.git' }],
  ])('returns 400 for %s', async (_description, body) => {
    const response = await postProjects(body)

    expect(response.statusCode).toBe(400)
  })

  it('derives repo_key from an https remote with a port, nested group, and .git suffix', async () => {
    const response = await postProjects({
      name: 'my-project',
      remoteUrl: 'https://gitlab.com:2222/group/subgroup/repo.git',
    })

    expect(response.statusCode).toBe(201)

    const row = db
      .prepare('SELECT repo_key FROM projects WHERE id = ?')
      .get(response.json().projectId) as { repo_key: string }

    expect(row.repo_key).toBe('gitlab.com/group/subgroup/repo')
  })

  it('derives remote_url from an https remote, using the unmangled host and dropping the port', async () => {
    const response = await postProjects({
      name: 'my-project',
      remoteUrl: 'https://gitlab-forge.din.developpement-durable.gouv.fr:2222/org/repo.git',
    })

    expect(response.statusCode).toBe(201)

    const row = db
      .prepare('SELECT remote_url FROM projects WHERE id = ?')
      .get(response.json().projectId) as { remote_url: string }

    expect(row.remote_url).toBe('https://gitlab-forge.din.developpement-durable.gouv.fr/org/repo')
  })
})
