import type {
  ProjectConflictResponseBody,
  RegisterProjectRequestBody,
  RegisterProjectResponseBody,
} from '@ripe/api/contracts/projects.js'

export interface ProjectRegistrationResult {
  status: 201 | 409
  projectId: string
  message?: string
}

export async function registerProject(
  serverUrl: string,
  name: string,
): Promise<ProjectRegistrationResult> {
  const url = new URL('/api/projects', serverUrl)
  const requestBody: RegisterProjectRequestBody = { name }
  const body = JSON.stringify(requestBody)

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  })

  if (res.status !== 201 && res.status !== 409) {
    throw new Error(`Unexpected response status: ${String(res.status)}`)
  }

  const parsed = (await res.json()) as RegisterProjectResponseBody | ProjectConflictResponseBody

  return {
    status: res.status,
    projectId: parsed.projectId,
    message: 'message' in parsed ? parsed.message : undefined,
  }
}
