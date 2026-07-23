import { render, screen } from '@testing-library/react'
import { http } from 'msw'
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
})
