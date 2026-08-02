import type { FastifyInstance, FastifyPluginAsync, FastifySchema } from 'fastify'
import type {
  ProjectResponseBodyItem,
  RegisterProjectRequestBody,
  RegisterProjectResponseBody,
} from '../contracts/projects.js'
import { InvalidRemoteUrlError } from '../domain/ProjectRepoReference.js'
import type { ListProjects } from '../use-cases/ListProjects.js'
import type { RegisterProject } from '../use-cases/RegisterProject.js'

interface ProjectEndpointOptions {
  registerProject: RegisterProject
  listProjects: ListProjects
}

const projectSchema: FastifySchema = {
  body: {
    type: 'object',
    required: ['name', 'remoteUrl'],
    properties: {
      name: { type: 'string', minLength: 1 },
      remoteUrl: { type: 'string', minLength: 1 },
    },
    additionalProperties: false,
  },
} as const

export const projectEndpoints: FastifyPluginAsync<ProjectEndpointOptions> = async (
  app: FastifyInstance,
  opts: ProjectEndpointOptions,
): Promise<void> => {
  app.post<{ Body: RegisterProjectRequestBody }>(
    '/projects',
    { schema: projectSchema },
    async (request, reply) => {
      const result = opts.registerProject.run(request.body.name, request.body.remoteUrl)

      if (result instanceof InvalidRemoteUrlError) {
        return reply.code(400).send({ message: result.message })
      }

      const body: RegisterProjectResponseBody = { projectId: result.projectId }

      return reply.code(result.created ? 201 : 200).send(body)
    },
  )

  app.get('/projects', async (_request, reply) => {
    const projects: ProjectResponseBodyItem[] = opts.listProjects.run()

    return reply.code(200).send(projects)
  })
}
