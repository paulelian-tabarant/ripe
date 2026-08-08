import type {
  RegisterProjectRequestBody,
  RegisterProjectResponseBody,
} from '@ripe/api/contracts/projects.js'

export interface ProjectRegistrationResult {
  wasAlreadyExisting: boolean
  projectId: string
}

export interface SkillRegistrationResult {
  name: string
  skillId: string
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
  registerSkills(projectId: string, names: string[]): Promise<SkillRegistrationResult[]>
}

export function createApiClient(serverUrl: string): ApiClient {
  return {
    getServerUrl: (): string => serverUrl,
    registerProject: (name: string, remoteUrl: string): Promise<ProjectRegistrationResult> =>
      registerProject(serverUrl, name, remoteUrl),
    registerSkills: (projectId: string, names: string[]): Promise<SkillRegistrationResult[]> =>
      registerSkills(serverUrl, projectId, names),
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
  names: string[],
): Promise<SkillRegistrationResult[]> {
  const url = new URL(`/api/projects/${projectId}/skills`, serverUrl)
  const body = JSON.stringify({ skills: names.map((name) => ({ name })) })

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  })

  if (res.status !== 200) {
    throw new Error(`Unexpected response status: ${String(res.status)}`)
  }

  return (await res.json()) as SkillRegistrationResult[]
}
