import { render, screen } from '@testing-library/react'
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
})
