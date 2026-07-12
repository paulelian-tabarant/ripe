import { useEffect, useState } from 'react'
import { type FetchProjectsResult, fetchProjects, type Project } from '../services/projectService'

export type ProjectsStatus = 'loading' | 'error' | 'success'

interface ProjectsState {
  status: ProjectsStatus
  projects: Project[]
}

export function useProjects(
  fetchProjectsFn: () => Promise<FetchProjectsResult> = fetchProjects,
): ProjectsState {
  const [state, setState] = useState<ProjectsState>({ status: 'loading', projects: [] })

  useEffect(() => {
    let cancelled = false
    setState({ status: 'loading', projects: [] })

    fetchProjectsFn().then((result) => {
      if (cancelled) {
        return
      }

      if (result.status === 'success') {
        setState({ status: 'success', projects: result.projects })
      } else {
        setState({ status: 'error', projects: [] })
      }
    })

    return () => {
      cancelled = true
    }
  }, [fetchProjectsFn])

  return state
}
