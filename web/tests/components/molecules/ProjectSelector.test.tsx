import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ProjectSelector } from '../../../src/components/molecules/ProjectSelector'

const projects = [
  { id: 'proj_1', name: 'Alpha' },
  { id: 'proj_2', name: 'Beta' },
]

describe('ProjectSelector', () => {
  it('lists the projects with no default selection', () => {
    render(<ProjectSelector projects={projects} selectedProjectId={undefined} onSelect={vi.fn()} />)

    expect(screen.getByRole('option', { name: 'Alpha' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Beta' })).toBeInTheDocument()
    expect(screen.getByRole('combobox')).toHaveValue('')
  })

  it('reflects the selected project', () => {
    render(<ProjectSelector projects={projects} selectedProjectId="proj_2" onSelect={vi.fn()} />)

    expect(screen.getByRole('combobox')).toHaveValue('proj_2')
  })

  it('calls onSelect with the chosen project id', async () => {
    const onSelect = vi.fn()
    const user = userEvent.setup()

    render(
      <ProjectSelector projects={projects} selectedProjectId={undefined} onSelect={onSelect} />,
    )
    await user.selectOptions(screen.getByRole('combobox'), 'Beta')

    expect(onSelect).toHaveBeenCalledWith('proj_2')
  })
})
