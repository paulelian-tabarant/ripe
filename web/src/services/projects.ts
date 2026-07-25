import type { ListProjectsResponseBody } from '@ripe/api/contracts/projects.js'

export async function fetchProjects(): Promise<ListProjectsResponseBody> {
  const response = await fetch('/api/projects')

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`)
  }

  return response.json()
}
