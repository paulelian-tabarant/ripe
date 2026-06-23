import Fastify, { type FastifyInstance } from 'fastify';
import type Database from 'better-sqlite3';
import { migrateDatabase } from './db/migrateDatabase.js';
import { healthRoutes } from './routes/healthRoutes.js';
import { projectRoutes } from './routes/projectRoutes.js';
import { ProjectRepository } from './repositories/ProjectRepository.js';
import { ProjectService } from './services/ProjectService.js';

export function buildApp(
  db: Database.Database,
  options: { logger?: boolean } = {}
): FastifyInstance {
  const app = Fastify({ logger: options.logger ?? true });

  migrateDatabase(db);

  const projectRepository = new ProjectRepository(db);
  const projectService = new ProjectService(projectRepository);

  app.register(healthRoutes);
  app.register(projectRoutes, { projectService });

  return app;
}
