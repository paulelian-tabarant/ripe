import type { FastifyPluginAsync, FastifyInstance } from 'fastify';

export const healthRoutes: FastifyPluginAsync = async (app: FastifyInstance): Promise<void> => {
  app.get('/api/health', async () => ({ status: 'ok' }));
};
