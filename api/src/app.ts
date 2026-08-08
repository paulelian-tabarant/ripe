import type Database from 'better-sqlite3'
import Fastify, { type FastifyInstance } from 'fastify'
import { ListProjects } from './core/use-cases/list-projects.js'
import { RegisterProject } from './core/use-cases/register-project.js'
import { healthEndpoints } from './endpoints/health.endpoints.js'
import { projectEndpoints } from './endpoints/project.endpoints.js'
import { requireNonEmptyDir, staticEndpoints } from './endpoints/static.endpoints.js'
import { ProjectRepository } from './infrastructure/project.repository.js'

export function buildApp(
  db: Database.Database,
  options: { logger?: boolean; shouldServeBuiltFrontend?: boolean; staticDir?: string } = {},
): FastifyInstance {
  const app = Fastify({ logger: options.logger ?? true })

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
