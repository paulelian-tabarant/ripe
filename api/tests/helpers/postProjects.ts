import type { FastifyInstance, LightMyRequestResponse } from 'fastify'
import type { ProjectRequestBody } from '../../src/endpoints/projectEndpoints.js'

export function prepareAndBindPostProjectsRequestTo(
  app: FastifyInstance,
): (body: Partial<ProjectRequestBody>) => Promise<LightMyRequestResponse> {
  return async (body: Partial<ProjectRequestBody>) =>
    await app.inject({
      method: 'POST',
      url: '/api/projects',
      payload: body,
    })
}
