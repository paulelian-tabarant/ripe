import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { server } from '../mocks/server'
import { DashboardPage } from './DashboardPage'

describe('DashboardPage', () => {
  it('shows a loading indicator while the API has not responded yet', () => {
    server.use(http.get('/api/projects', () => new Promise(() => {})))

    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>,
    )

    expect(screen.getByText('Loading projects…')).toBeInTheDocument()
  })

  it('lists both projects as dropdown options with a placeholder selected', async () => {
    server.use(
      http.get('/api/projects', () =>
        HttpResponse.json([
          { id: '1', name: 'Alpha' },
          { id: '2', name: 'Beta' },
        ]),
      ),
    )

    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>,
    )

    expect(await screen.findByRole('option', { name: 'Alpha' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Beta' })).toBeInTheDocument()
    expect(screen.getByRole('combobox')).toHaveValue('')
  })

  it('updates the selected value when the user picks a project', async () => {
    const user = userEvent.setup()
    server.use(
      http.get('/api/projects', () =>
        HttpResponse.json([
          { id: '1', name: 'Alpha' },
          { id: '2', name: 'Beta' },
        ]),
      ),
    )

    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>,
    )

    await screen.findByRole('option', { name: 'Alpha' })
    await user.selectOptions(screen.getByRole('combobox'), 'Beta')

    expect(screen.getByRole('combobox')).toHaveValue('2')
  })

  it('shows an empty-state message and no dropdown when there are no projects', async () => {
    server.use(http.get('/api/projects', () => HttpResponse.json([])))

    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>,
    )

    expect(await screen.findByText('No projects registered')).toBeInTheDocument()
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
  })
})
