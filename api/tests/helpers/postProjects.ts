import type { FastifyInstance, LightMyRequestResponse } from 'fastify'
import type { RegisterProjectRequestBody } from '../../src/contracts/projects.js'

export function prepareAndBindPostProjectsRequestTo(
  app: FastifyInstance,
): (body: Partial<RegisterProjectRequestBody>) => Promise<LightMyRequestResponse> {
  return async (body: Partial<RegisterProjectRequestBody>) =>
    await app.inject({
      method: 'POST',
      url: '/api/projects',
      payload: body,
    })
}
