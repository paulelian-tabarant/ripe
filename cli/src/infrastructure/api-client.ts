import type {
  RegisterProjectRequestBody,
  RegisterProjectResponseBody,
} from '@ripe/api/contracts/projects.js'
import type {
  RegisterSkillsRequestBody,
  SkillResponseBodyItem,
} from '@ripe/api/contracts/skills.js'

export interface ProjectRegistrationResult {
  wasAlreadyExisting: boolean
  projectId: string
}

export class ServerInvalidRemoteUrlError extends Error {
  constructor(status: number) {
    super(`Server rejected the request: ${String(status)}`)
    this.name = 'ServerInvalidRemoteUrlError'
  }
}

export interface ApiClient {
  getServerUrl(): string
  registerProject(name: string, remoteUrl: string): Promise<ProjectRegistrationResult>
  registerSkills(projectId: string, skillNames: string[]): Promise<SkillResponseBodyItem[]>
}

export function createApiClient(serverUrl: string): ApiClient {
  return {
    getServerUrl: (): string => serverUrl,
    registerProject: (name: string, remoteUrl: string): Promise<ProjectRegistrationResult> =>
      registerProject(serverUrl, name, remoteUrl),
    registerSkills: (projectId: string, skillNames: string[]): Promise<SkillResponseBodyItem[]> =>
      registerSkills(serverUrl, projectId, skillNames),
  }
}

async function registerProject(
  serverUrl: string,
  name: string,
  remoteUrl: string,
): Promise<ProjectRegistrationResult> {
  const url = new URL('/api/projects', serverUrl)
  const requestBody: RegisterProjectRequestBody = { name, remoteUrl }
  const body = JSON.stringify(requestBody)

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  })

  if (res.status === 400) {
    throw new ServerInvalidRemoteUrlError(res.status)
  }

  if (res.status !== 200 && res.status !== 201) {
    throw new Error(`Unexpected response status: ${String(res.status)}`)
  }

  const parsed = (await res.json()) as RegisterProjectResponseBody

  return { wasAlreadyExisting: res.status === 200, projectId: parsed.projectId }
}

async function registerSkills(
  serverUrl: string,
  projectId: string,
  skillNames: string[],
): Promise<SkillResponseBodyItem[]> {
  const url = new URL(`/api/projects/${projectId}/skills`, serverUrl)
  const requestBody: RegisterSkillsRequestBody = { skills: skillNames.map((name) => ({ name })) }
  const body = JSON.stringify(requestBody)

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  })

  if (res.status !== 200) {
    throw new Error(`Unexpected response status: ${String(res.status)}`)
  }

  return (await res.json()) as SkillResponseBodyItem[]
}
