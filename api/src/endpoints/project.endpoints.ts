import type { FastifyInstance, FastifyPluginAsync, FastifySchema } from 'fastify'
import { InvalidRemoteUrlError } from '../core/domain/git-repository.js'
import type { ListProjects } from '../core/use-cases/list-projects.js'
import type { RegisterProject } from '../core/use-cases/register-project.js'
import type {
  ProjectResponseBodyItem,
  RegisterProjectRequestBody,
  RegisterProjectResponseBody,
} from './contracts/projects.js'

interface ProjectEndpointOptions {
  registerProject: RegisterProject
  listProjects: ListProjects
}

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
