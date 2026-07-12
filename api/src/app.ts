import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fastifyStatic from '@fastify/static'
import type Database from 'better-sqlite3'
import Fastify, { type FastifyInstance } from 'fastify'
import { migrateDatabase } from './db/migrateDatabase.js'
import { healthEndpoints } from './endpoints/healthEndpoints.js'
import { projectEndpoints } from './endpoints/projectEndpoints.js'
import { ProjectRepository } from './repositories/ProjectRepository.js'
import { ListProjects } from './use-cases/ListProjects.js'
import { RegisterProject } from './use-cases/RegisterProject.js'

const DEFAULT_STATIC_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../web/dist',
)
const API_PREFIX = '/api'

export function buildApp(
  db: Database.Database,
  options: { logger?: boolean; staticRoot?: string } = {},
): FastifyInstance {
  const app = Fastify({ logger: options.logger ?? true })
  const staticRoot = options.staticRoot ?? DEFAULT_STATIC_ROOT

  migrateDatabase(db)

  const projectRepository = new ProjectRepository(db)
  const registerProject = new RegisterProject(projectRepository)
  const listProjects = new ListProjects(projectRepository)

  app.register(healthEndpoints)
  app.register(projectEndpoints, { prefix: API_PREFIX, registerProject, listProjects })

  if (fs.existsSync(staticRoot)) registerStatic(app, staticRoot)

  return app
}

function registerStatic(app: FastifyInstance, staticRoot: string): void {
  app.register(fastifyStatic, { root: staticRoot })

  app.setNotFoundHandler((request, reply) => {
    const isSpaNavigation = request.method === 'GET' && !request.url.startsWith(API_PREFIX)

    if (isSpaNavigation) {
      reply.sendFile('index.html')
      return
    }

    reply.code(404).send({
      message: `Route ${request.method}:${request.url} not found`,
      error: 'Not Found',
      statusCode: 404,
    })
  })
}
