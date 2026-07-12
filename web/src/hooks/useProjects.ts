import { useEffect, useState } from 'react'
import { fetchProjects, type Project } from '../services/projectService'

export interface ProjectsState {
  status: 'loading' | 'error' | 'success'
  projects: Project[]
}

export function useProjects(
  fetchProjectsFn: () => Promise<Project[]> = fetchProjects,
): ProjectsState {
  const [state, setState] = useState<ProjectsState>({ status: 'loading', projects: [] })

  useEffect(() => {
    let cancelled = false
    setState({ status: 'loading', projects: [] })

    fetchProjectsFn()
      .then((projects) => {
        if (!cancelled) {
          setState({ status: 'success', projects })
        }
      })
      .catch(() => {
        if (!cancelled) {
          setState({ status: 'error', projects: [] })
        }
      })

    return () => {
      cancelled = true
    }
  }, [fetchProjectsFn])

  return state
}
