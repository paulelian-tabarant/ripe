import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { DashboardPage } from '../../src/pages/DashboardPage'

describe('DashboardPage', () => {
  it('shows a loading indicator and nothing else while the request is pending', () => {
    const fetchProjectsFn = vi.fn().mockReturnValue(new Promise(() => {}))

    render(<DashboardPage fetchProjectsFn={fetchProjectsFn} />)

    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.queryByText(/no projects/i)).not.toBeInTheDocument()
  })

  it('lists the registered projects with no default selection', async () => {
    const fetchProjectsFn = vi.fn().mockResolvedValue([
      { id: 'proj_1', name: 'Alpha' },
      { id: 'proj_2', name: 'Beta' },
    ])

    render(<DashboardPage fetchProjectsFn={fetchProjectsFn} />)

    await waitFor(() => expect(screen.getByRole('combobox')).toBeInTheDocument())

    expect(screen.getByRole('option', { name: 'Alpha' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Beta' })).toBeInTheDocument()
    expect(screen.getByRole('combobox')).toHaveValue('')
  })

  it('lets the user select a project', async () => {
    const fetchProjectsFn = vi.fn().mockResolvedValue([
      { id: 'proj_1', name: 'Alpha' },
      { id: 'proj_2', name: 'Beta' },
    ])
    const user = userEvent.setup()

    render(<DashboardPage fetchProjectsFn={fetchProjectsFn} />)
    await waitFor(() => expect(screen.getByRole('combobox')).toBeInTheDocument())
    await user.selectOptions(screen.getByRole('combobox'), 'Beta')

    expect(screen.getByRole('combobox')).toHaveValue('proj_2')
  })

  it('shows an empty-state message when no projects are registered', async () => {
    const fetchProjectsFn = vi.fn().mockResolvedValue([])

    render(<DashboardPage fetchProjectsFn={fetchProjectsFn} />)

    await waitFor(() => expect(screen.getByText(/no projects/i)).toBeInTheDocument())
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
  })

  it('shows an error message when the request fails', async () => {
    const fetchProjectsFn = vi.fn().mockRejectedValue(new Error('network error'))

    render(<DashboardPage fetchProjectsFn={fetchProjectsFn} />)

    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument())
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
  })
})
