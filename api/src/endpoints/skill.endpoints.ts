import type { FastifyInstance, FastifyPluginAsync, FastifySchema } from 'fastify'
import { DuplicateSkillNameError } from '../core/domain/project.js'
import {
  type RegisterSkillsIntoProject,
  UnknownProjectError,
} from '../core/use-cases/register-skills-into-project.js'
import type { RegisterSkillsRequestBody, SkillResponseBodyItem } from './contracts/skills.js'

interface SkillEndpointOptions {
  registerSkillsIntoProject: RegisterSkillsIntoProject
}

const registerSkillsSchema: FastifySchema = {
  params: {
    type: 'object',
    required: ['id'],
    properties: {
      id: { type: 'string', minLength: 1 },
    },
  },
  body: {
    type: 'object',
    required: ['skills'],
    properties: {
      skills: {
        type: 'array',
        items: {
          type: 'object',
          required: ['name'],
          properties: {
            name: { type: 'string', minLength: 1, pattern: '^[^:]+$' },
          },
        },
      },
    },
    additionalProperties: false,
  },
} as const

export const skillEndpoints: FastifyPluginAsync<SkillEndpointOptions> = async (
  app: FastifyInstance,
  opts: SkillEndpointOptions,
): Promise<void> => {
  app.post<{ Params: { id: string }; Body: RegisterSkillsRequestBody }>(
    '/projects/:id/skills',
    { schema: registerSkillsSchema },
    async (request, reply) => {
      const names = request.body.skills.map((skill) => skill.name)
      const result = opts.registerSkillsIntoProject.run(request.params.id, names)

      if (result instanceof UnknownProjectError) {
        return reply.code(404).send()
      }

      if (result instanceof DuplicateSkillNameError) {
        return reply.code(422).send()
      }

      const body: SkillResponseBodyItem[] = result

      return reply.code(200).send(body)
    },
  )
}
