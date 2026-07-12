import { readdirSync } from 'node:fs'
import fastifyStatic from '@fastify/static'
import type { FastifyInstance, FastifyPluginAsync } from 'fastify'

interface StaticEndpointOptions {
  staticDir: string
}

export const staticEndpoints: FastifyPluginAsync<StaticEndpointOptions> = async (
  app: FastifyInstance,
  opts: StaticEndpointOptions,
): Promise<void> => {
  app.register(fastifyStatic, { root: opts.staticDir })

  app.setNotFoundHandler((request, reply) => {
    const isApiRoute = request.url === '/api' || request.url.startsWith('/api/')
    if (request.method === 'GET' && !isApiRoute) {
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

export function requireNonEmptyDir(staticDir: string | undefined): string {
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
