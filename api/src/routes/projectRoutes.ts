import type { FastifyInstance, FastifyPluginAsync, FastifySchema } from 'fastify';
import type { ListProjects } from '../use-cases/ListProjects.js';
import type { RegisterProject } from '../use-cases/RegisterProject.js';

interface ProjectRouteOptions {
  registerProject: RegisterProject;
  listProjects: ListProjects;
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
} as const;

export interface ProjectRequestBody {
  name: string;
}

export const projectRoutes: FastifyPluginAsync<ProjectRouteOptions> = async (
  app: FastifyInstance,
  opts: ProjectRouteOptions,
): Promise<void> => {
  app.post<{ Body: ProjectRequestBody }>(
    '/projects',
    { schema: projectSchema },
    async (request, reply) => {
      const result = opts.registerProject.run(request.body.name);

      if (result.created) {
        return reply.code(201).send({ projectId: result.projectId });
      }

      return reply.code(409).send({
        projectId: result.projectId,
        message: 'Project already exists',
      });
    },
  );

  app.get('/projects', async (_request, reply) => {
    const projects = opts.listProjects.run();

    return reply.code(200).send(projects);
  });
};
