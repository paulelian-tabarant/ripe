export interface Project {
  id: string
  name: string
}

export type FetchProjectsResult = { status: 'success'; projects: Project[] } | { status: 'error' }

export async function fetchProjects(): Promise<FetchProjectsResult> {
  try {
    const response = await fetch('/api/projects')

    if (!response.ok) {
      return { status: 'error' }
    }

    const projects = (await response.json()) as Project[]
    return { status: 'success', projects }
  } catch {
    return { status: 'error' }
  }
}
