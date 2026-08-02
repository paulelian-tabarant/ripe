import type {
  RegisterProjectRequestBody,
  RegisterProjectResponseBody,
} from '@ripe/api/contracts/projects.js'

export interface ProjectRegistrationResult {
  created: boolean
  projectId: string
}

export async function registerProject(
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

  if (res.status !== 200 && res.status !== 201) {
    throw new Error(`Unexpected response status: ${String(res.status)}`)
  }

  const parsed = (await res.json()) as RegisterProjectResponseBody

  return { created: res.status === 201, projectId: parsed.projectId }
}
