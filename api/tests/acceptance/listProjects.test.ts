import Database from 'better-sqlite3';
import type { FastifyInstance, LightMyRequestResponse } from 'fastify';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '../../src/app.js';
import { prepareAndBindPostProjectsRequestTo } from '../helpers/postProjects.js';

describe('GET /api/projects', () => {
  let app: FastifyInstance;
  let postProjects: ReturnType<typeof prepareAndBindPostProjectsRequestTo>;

  beforeEach(() => {
    const db = new Database(':memory:');
    app = buildApp(db, { logger: false });
    postProjects = prepareAndBindPostProjectsRequestTo(app);
  });

  afterEach(async () => {
    await app.close();
  });

  it('returns 200 with an empty array when no projects are registered', async () => {
    const response = await getProjects();

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual([]);
  });

  it('returns 200 with all registered projects', async () => {
    const first = await postProjects({ name: 'my-project' });
    const second = await postProjects({ name: 'other-project' });

    const response = await getProjects();

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual([
      { id: first.json().projectId, name: 'my-project' },
      { id: second.json().projectId, name: 'other-project' },
    ]);
  });

  async function getProjects(): Promise<LightMyRequestResponse> {
    return await app.inject({ method: 'GET', url: '/api/projects' });
  }
});
