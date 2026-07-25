import type { FastifyInstance, FastifyPluginAsync, FastifySchema } from 'fastify'
import type {
  ListProjectsResponseBody,
  ProjectConflictResponseBody,
  RegisterProjectRequestBody,
  RegisterProjectResponseBody,
} from '../contracts/projects.js'
import type { ListProjects } from '../use-cases/ListProjects.js'
import type { RegisterProject } from '../use-cases/RegisterProject.js'

interface ProjectEndpointOptions {
  registerProject: RegisterProject
  listProjects: ListProjects
}

const projectSchema: FastifySchema = {
  body: {
    type: 'object',
    required: ['name'],
    properties: {
      name: { type: 'string', minLength: 1 },
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
      const result = opts.registerProject.run(request.body.name)

      if (result.created) {
        const body: RegisterProjectResponseBody = { projectId: result.projectId }
        return reply.code(201).send(body)
      }

      const body: ProjectConflictResponseBody = {
        projectId: result.projectId,
        message: 'Project already exists',
      }
      return reply.code(409).send(body)
    },
  )

  app.get('/projects', async (_request, reply) => {
    const projects: ListProjectsResponseBody = opts.listProjects.run()

    return reply.code(200).send(projects)
  })
}
