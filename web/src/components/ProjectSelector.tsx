import type { ProjectResponseBodyItem } from '@ripe/api/contracts/projects.js'
import type { ChangeEvent, ReactElement } from 'react'

interface ProjectSelectorProps {
  projects: ProjectResponseBodyItem[]
  selectedProjectId: string
  onChange: (projectId: string) => void
}

export function ProjectSelector({
  projects,
  selectedProjectId,
  onChange,
}: ProjectSelectorProps): ReactElement {
  return (
    <select
      value={selectedProjectId}
      onChange={(event: ChangeEvent<HTMLSelectElement>) => onChange(event.target.value)}
      className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
    >
      <option value="" disabled>
        Select a project…
      </option>
      {projects.map((project) => (
        <option key={project.id} value={project.id}>
          {project.name}
        </option>
      ))}
    </select>
  )
}
