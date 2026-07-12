export interface Project {
  id: string
  name: string
}

export async function fetchProjects(): Promise<Project[]> {
  const response = await fetch('/api/projects')

  if (!response.ok) {
    throw new Error(`Failed to fetch projects: ${response.status}`)
  }

  return (await response.json()) as Project[]
}
