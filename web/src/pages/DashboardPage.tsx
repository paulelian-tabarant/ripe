import type { ReactElement } from 'react'
import { useState } from 'react'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { Message } from '../components/Message'
import { ProjectSelector } from '../components/ProjectSelector'
import { useAsync } from '../hooks/useAsync'
import { fetchProjects } from '../services/projects'

export function DashboardPage(): ReactElement {
  const projectsState = useAsync(fetchProjects)
  const [selectedId, setSelectedId] = useState('')

  if (projectsState.kind === 'loading') {
    return <LoadingSpinner />
  }

  if (projectsState.kind === 'error') {
    return <Message variant="error">Failed to load projects</Message>
  }

  if (projectsState.data.length === 0) {
    return <Message variant="info">No projects registered</Message>
  }

  return (
    <ProjectSelector projects={projectsState.data} value={selectedId} onChange={setSelectedId} />
  )
}
