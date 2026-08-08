import type { FastifyInstance, FastifyPluginAsync } from 'fastify'
import type { HealthResponseBody } from './contracts/health.js'

export const healthEndpoints: FastifyPluginAsync = async (app: FastifyInstance): Promise<void> => {
  app.get('/api/health', async (): Promise<HealthResponseBody> => ({ status: 'ok' }))
}
