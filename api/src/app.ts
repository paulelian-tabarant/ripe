import { readdirSync } from 'node:fs'
import fastifyStatic from '@fastify/static'
import type Database from 'better-sqlite3'
import Fastify, { type FastifyInstance } from 'fastify'
import { migrateDatabase } from './db/migrateDatabase.js'
import { healthEndpoints } from './endpoints/healthEndpoints.js'
import { projectEndpoints } from './endpoints/projectEndpoints.js'
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

  if (options.shouldServeBuiltFrontend) registerBuiltFrontend(app, options.staticDir)

  return app
}

function registerBuiltFrontend(app: FastifyInstance, staticDir: string | undefined): void {
  const verifiedStaticDir = requireNonEmptyDir(staticDir)

  app.register(fastifyStatic, { root: verifiedStaticDir })

  app.setNotFoundHandler((request, reply) => {
    if (request.method === 'GET' && !request.url.startsWith('/api')) {
      reply.sendFile('index.html')
      return
    }

    reply.code(404).send({
      statusCode: 404,
      error: 'Not Found',
      message: `Route ${request.method}:${request.url} not found`,
    })
  })
}

function requireNonEmptyDir(staticDir: string | undefined): string {
  if (!staticDir)
    throw new Error('SHOULD_SERVE_BUILT_FRONTEND is enabled but no staticDir was provided')

  let entries: string[]

  try {
    entries = readdirSync(staticDir)
  } catch {
    throw new Error(`Static frontend directory not found: ${staticDir}`)
  }

  if (entries.length === 0) throw new Error(`Static frontend directory is empty: ${staticDir}`)

  return staticDir
}
