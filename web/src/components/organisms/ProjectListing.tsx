import type { ReactElement } from 'react'
import type { Project } from '../../services/projectService'
import { EmptyState } from '../atoms/EmptyState'
import { ErrorMessage } from '../atoms/ErrorMessage'
import { LoadingSpinner } from '../atoms/LoadingSpinner'
import { ProjectSelector } from '../molecules/ProjectSelector'

interface ProjectListingProps {
  status: 'loading' | 'error' | 'success'
  projects: Project[]
  selectedProjectId: string | undefined
  onSelect: (projectId: string) => void
}

export function ProjectListing({
  status,
  projects,
  selectedProjectId,
  onSelect,
}: ProjectListingProps): ReactElement {
  if (status === 'loading') {
    return <LoadingSpinner />
  }

  if (status === 'error') {
    return <ErrorMessage message="Failed to load projects." />
  }

  if (projects.length === 0) {
    return <EmptyState message="No projects registered yet." />
  }

  return (
    <ProjectSelector
      projects={projects}
      selectedProjectId={selectedProjectId}
      onSelect={onSelect}
    />
  )
}
