import type { FastifyInstance, LightMyRequestResponse } from 'fastify';
import type { ProjectRequestBody } from '../../src/routes/projectRoutes.js';

export async function postProjects(
  app: FastifyInstance,
  body: Partial<ProjectRequestBody>
): Promise<LightMyRequestResponse> {
  return await app.inject({
    method: 'POST',
    url: '/api/projects',
    payload: body,
  });
}
