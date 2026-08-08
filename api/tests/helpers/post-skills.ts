import type { FastifyInstance, InjectOptions, LightMyRequestResponse } from 'fastify'

export function prepareAndBindPostSkillsRequestTo(
  app: FastifyInstance,
): (projectId: string, body: InjectOptions['payload']) => Promise<LightMyRequestResponse> {
  return async (projectId: string, body: InjectOptions['payload']) =>
    await app.inject({
      method: 'POST',
      url: `/api/projects/${projectId}/skills`,
      payload: body,
    })
}
