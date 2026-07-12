import { HttpResponse, http } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { fetchProjects } from '../../src/services/projectService'

const server = setupServer()

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe('fetchProjects', () => {
  it('returns the projects from the API', async () => {
    server.use(
      http.get('/api/projects', () =>
        HttpResponse.json([
          { id: 'proj_1', name: 'Alpha' },
          { id: 'proj_2', name: 'Beta' },
        ]),
      ),
    )

    const projects = await fetchProjects()

    expect(projects).toEqual([
      { id: 'proj_1', name: 'Alpha' },
      { id: 'proj_2', name: 'Beta' },
    ])
  })

  it('throws when the API responds with an error status', async () => {
    server.use(http.get('/api/projects', () => new HttpResponse(null, { status: 500 })))

    await expect(fetchProjects()).rejects.toThrow()
  })
})
