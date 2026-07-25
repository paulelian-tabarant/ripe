import type { ProjectResponseBodyItem } from '@ripe/api/contracts/projects.js'

export async function fetchProjects(): Promise<ProjectResponseBodyItem[]> {
  const response = await fetch('/api/projects')

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`)
  }

  return response.json()
}
