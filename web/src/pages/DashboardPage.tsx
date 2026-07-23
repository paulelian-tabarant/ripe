import type { ReactElement } from 'react'
import { useEffect, useState } from 'react'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { Message } from '../components/Message'
import { type Project, ProjectSelector } from '../components/ProjectSelector'

type State = { kind: 'loading' } | { kind: 'success'; projects: Project[] }

export function DashboardPage(): ReactElement {
  const [state, setState] = useState<State>({ kind: 'loading' })
  const [selectedId, setSelectedId] = useState('')

  useEffect(() => {
    let cancelled = false

    fetch('/api/projects')
      .then((response) => response.json())
      .then((projects: Project[]) => {
        if (!cancelled) {
          setState({ kind: 'success', projects })
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  if (state.kind === 'loading') {
    return <LoadingSpinner />
  }

  if (state.projects.length === 0) {
    return <Message variant="info">No projects registered</Message>
  }

  return <ProjectSelector projects={state.projects} value={selectedId} onChange={setSelectedId} />
}
