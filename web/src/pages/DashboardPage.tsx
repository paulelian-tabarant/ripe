import { type ReactElement, useState } from 'react'
import { ProjectListing } from '../components/organisms/ProjectListing'
import { useProjects } from '../hooks/useProjects'
import type { FetchProjectsResult } from '../services/projectService'

interface DashboardPageProps {
  fetchProjectsFn?: () => Promise<FetchProjectsResult>
}

export function DashboardPage({ fetchProjectsFn }: DashboardPageProps = {}): ReactElement {
  const { status, projects } = useProjects(fetchProjectsFn)
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>(undefined)

  return (
    <ProjectListing
      status={status}
      projects={projects}
      selectedProjectId={selectedProjectId}
      onSelect={setSelectedProjectId}
    />
  )
}
