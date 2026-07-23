import type { ReactElement } from 'react'
import { useEffect, useState } from 'react'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { Message } from '../components/Message'
import { type Project, ProjectSelector } from '../components/ProjectSelector'

type State = { kind: 'loading' } | { kind: 'success'; projects: Project[] } | { kind: 'error' }

export function DashboardPage(): ReactElement {
  const [state, setState] = useState<State>({ kind: 'loading' })
  const [selectedId, setSelectedId] = useState('')

  useEffect(() => {
    let cancelled = false

    fetch('/api/projects')
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`)
        }
        return response.json()
      })
      .then((projects: Project[]) => {
        if (!cancelled) {
          setState({ kind: 'success', projects })
        }
      })
      .catch(() => {
        if (!cancelled) {
          setState({ kind: 'error' })
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  if (state.kind === 'loading') {
    return <LoadingSpinner />
  }

  if (state.kind === 'error') {
    return <Message variant="error">Failed to load projects</Message>
  }

  if (state.projects.length === 0) {
    return <Message variant="info">No projects registered</Message>
  }

  return <ProjectSelector projects={state.projects} value={selectedId} onChange={setSelectedId} />
}
