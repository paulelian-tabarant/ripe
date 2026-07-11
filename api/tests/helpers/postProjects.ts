import type { FastifyInstance, LightMyRequestResponse } from 'fastify';
import type { ProjectRequestBody } from '../../src/routes/projectRoutes.js';

export function createPostProjects(
  app: FastifyInstance
): (body: Partial<ProjectRequestBody>) => Promise<LightMyRequestResponse> {
  return async (body: Partial<ProjectRequestBody>) =>
    await app.inject({
      method: 'POST',
      url: '/api/projects',
      payload: body,
    });
}
