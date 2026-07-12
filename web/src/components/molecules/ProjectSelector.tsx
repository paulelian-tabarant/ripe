import type { ChangeEvent, ReactElement } from 'react'
import type { Project } from '../../services/projectService'

interface ProjectSelectorProps {
  projects: Project[]
  selectedProjectId: string | undefined
  onSelect: (projectId: string) => void
}

export function ProjectSelector({
  projects,
  selectedProjectId,
  onSelect,
}: ProjectSelectorProps): ReactElement {
  function handleChange(event: ChangeEvent<HTMLSelectElement>): void {
    onSelect(event.target.value)
  }

  return (
    <select aria-label="Select a project" value={selectedProjectId ?? ''} onChange={handleChange}>
      <option value="" disabled>
        Select a project
      </option>
      {projects.map((project) => (
        <option key={project.id} value={project.id}>
          {project.name}
        </option>
      ))}
    </select>
  )
}
