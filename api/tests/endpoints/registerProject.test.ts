import Database from 'better-sqlite3'
import type { FastifyInstance } from 'fastify'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { buildApp } from '../../src/app.js'
import { prepareAndBindPostProjectsRequestTo } from '../helpers/postProjects.js'

describe('POST /api/projects', () => {
  let db: Database.Database
  let app: FastifyInstance
  let postProjects: ReturnType<typeof prepareAndBindPostProjectsRequestTo>

  beforeEach(() => {
    db = new Database(':memory:')
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

  it('returns 400 for a missing remoteUrl field', async () => {
    const response = await postProjects({ name: 'my-project' })

    expect(response.statusCode).toBe(400)
  })

  it('returns 400 for a missing name field', async () => {
    const response = await postProjects({ remoteUrl: 'https://github.com/org/repo.git' })

    expect(response.statusCode).toBe(400)
  })

  it('returns 400 for an empty name string', async () => {
    const response = await postProjects({ name: '', remoteUrl: 'https://github.com/org/repo.git' })

    expect(response.statusCode).toBe(400)
  })

  it('returns 400 for an unparseable remoteUrl', async () => {
    const response = await postProjects({ name: 'my-project', remoteUrl: 'not a url' })

    expect(response.statusCode).toBe(400)
  })

  it('returns 400 for an empty remoteUrl', async () => {
    const response = await postProjects({ name: 'my-project', remoteUrl: '' })

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

  it('returns 400 for a non-https remoteUrl', async () => {
    const response = await postProjects({
      name: 'my-project',
      remoteUrl: 'git@github.com:org/repo.git',
    })

    expect(response.statusCode).toBe(400)
  })
})
