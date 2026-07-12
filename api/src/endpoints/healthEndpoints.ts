import type { FastifyInstance, FastifyPluginAsync } from 'fastify'

export const healthEndpoints: FastifyPluginAsync = async (app: FastifyInstance): Promise<void> => {
  app.get('/api/health', async () => ({ status: 'ok' }))
}
