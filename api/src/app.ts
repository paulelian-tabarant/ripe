import type Database from 'better-sqlite3'
import Fastify, { type FastifyInstance } from 'fastify'
import { migrateDatabase } from './db/migrateDatabase.js'
import { healthEndpoints } from './endpoints/healthEndpoints.js'
import { projectEndpoints } from './endpoints/projectEndpoints.js'
import { requireNonEmptyDir, staticEndpoints } from './endpoints/staticEndpoints.js'
import { ProjectRepository } from './repositories/ProjectRepository.js'
import { ListProjects } from './use-cases/ListProjects.js'
import { RegisterProject } from './use-cases/RegisterProject.js'

export function buildApp(
  db: Database.Database,
  options: { logger?: boolean; shouldServeBuiltFrontend?: boolean; staticDir?: string } = {},
): FastifyInstance {
  const app = Fastify({ logger: options.logger ?? true })

  migrateDatabase(db)

  const projectRepository = new ProjectRepository(db)
  const registerProject = new RegisterProject(projectRepository)
  const listProjects = new ListProjects(projectRepository)

  app.register(healthEndpoints)
  app.register(projectEndpoints, { prefix: '/api', registerProject, listProjects })

  if (options.shouldServeBuiltFrontend) {
    app.register(staticEndpoints, { staticDir: requireNonEmptyDir(options.staticDir) })
  }

  return app
}
