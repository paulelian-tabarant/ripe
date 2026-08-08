import type { FastifyInstance } from 'fastify'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { buildApp } from '../../src/app.js'
import { createTestDb } from '../helpers/create-test-db.js'
import { prepareAndBindPostProjectsRequestTo } from '../helpers/post-projects.js'
import { prepareAndBindPostSkillsRequestTo } from '../helpers/post-skills.js'

describe('POST /api/projects/:id/skills', () => {
  let app: FastifyInstance
  let postProjects: ReturnType<typeof prepareAndBindPostProjectsRequestTo>
  let postSkills: ReturnType<typeof prepareAndBindPostSkillsRequestTo>

  beforeEach(() => {
    const db = createTestDb()
    app = buildApp(db, { logger: false })
    postProjects = prepareAndBindPostProjectsRequestTo(app)
    postSkills = prepareAndBindPostSkillsRequestTo(app)
  })

  afterEach(async () => {
    await app.close()
  })

  async function registerProject(): Promise<string> {
    const response = await postProjects({
      name: 'my-project',
      remoteUrl: 'https://github.com/org/repo.git',
    })

    return response.json().projectId
  }

  it('returns 200 with a skillId for each new name when the project has no skills yet', async () => {
    const projectId = await registerProject()

    const response = await postSkills(projectId, {
      skills: [{ name: 'skill-a' }, { name: 'skill-b' }],
    })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body).toHaveLength(2)
    expect(body[0]).toMatchObject({ name: 'skill-a' })
    expect(body[0].skillId).toMatch(/^skill_/)
    expect(body[1]).toMatchObject({ name: 'skill-b' })
    expect(body[1].skillId).toMatch(/^skill_/)
  })

  it('returns the same skillIds when the same names are registered again', async () => {
    const projectId = await registerProject()

    const first = await postSkills(projectId, { skills: [{ name: 'skill-a' }] })
    const second = await postSkills(projectId, { skills: [{ name: 'skill-a' }] })

    expect(second.statusCode).toBe(200)
    expect(second.json()).toEqual(first.json())
  })

  it('keeps existing skillIds and assigns fresh ones for new names in the same request', async () => {
    const projectId = await registerProject()

    const first = await postSkills(projectId, { skills: [{ name: 'skill-a' }] })
    const second = await postSkills(projectId, {
      skills: [{ name: 'skill-a' }, { name: 'skill-b' }],
    })

    expect(second.statusCode).toBe(200)
    const body = second.json()
    expect(body).toHaveLength(2)
    expect(body.find((s: { name: string }) => s.name === 'skill-a').skillId).toBe(
      first.json()[0].skillId,
    )
    expect(body.find((s: { name: string }) => s.name === 'skill-b').skillId).toMatch(/^skill_/)
  })

  it('returns 404 for an unknown project id', async () => {
    const response = await postSkills('proj_unknown', { skills: [{ name: 'skill-a' }] })

    expect(response.statusCode).toBe(404)
  })

  it.each([
    ['a missing name field', { skills: [{}] }],
    ['an empty name string', { skills: [{ name: '' }] }],
  ])('returns 400 for %s', async (_description, body) => {
    const projectId = await registerProject()

    const response = await postSkills(projectId, body)

    expect(response.statusCode).toBe(400)
  })

  it('returns 400 for a namespaced skill name', async () => {
    const projectId = await registerProject()

    const response = await postSkills(projectId, { skills: [{ name: 'namespace:skill' }] })

    expect(response.statusCode).toBe(400)
  })

  it('returns 422 for duplicate names within the same request', async () => {
    const projectId = await registerProject()

    const response = await postSkills(projectId, {
      skills: [{ name: 'skill-a' }, { name: 'skill-a' }],
    })

    expect(response.statusCode).toBe(422)
  })

  it('returns 200 with [] for an empty skills array', async () => {
    const projectId = await registerProject()

    const response = await postSkills(projectId, { skills: [] })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual([])
  })
})
