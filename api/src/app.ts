import Fastify, { type FastifyInstance } from 'fastify';
import type Database from 'better-sqlite3';
import { migrateDatabase } from './db/migrateDatabase.js';
import { healthRoutes } from './routes/healthRoutes.js';
import { projectRoutes } from './routes/projectRoutes.js';
import { ProjectRepository } from './repositories/ProjectRepository.js';
import { ListProjects } from './use-cases/ListProjects.js';
import { RegisterProject } from './use-cases/RegisterProject.js';

export function buildApp(
  db: Database.Database,
  options: { logger?: boolean } = {}
): FastifyInstance {
  const app = Fastify({ logger: options.logger ?? true });

  migrateDatabase(db);

  const projectRepository = new ProjectRepository(db);
  const registerProject = new RegisterProject(projectRepository);
  const listProjects = new ListProjects(projectRepository);

  app.register(healthRoutes);
  app.register(projectRoutes, { prefix: '/api', registerProject, listProjects });

  return app;
}
