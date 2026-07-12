import { render, screen } from '@testing-library/react'
import { HttpResponse, http } from 'msw'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { server } from '../mocks/server'
import { HomePage } from './HomePage'

describe('HomePage', () => {
  it('renders the heading immediately and the API health status once resolved', async () => {
    server.use(http.get('/api/health', () => HttpResponse.json({ status: 'ok' })))

    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    )

    expect(screen.getByText('Hello, World')).toBeInTheDocument()
    expect(await screen.findByText('API status: ok')).toBeInTheDocument()
  })

  it('shows an error state when the health check fails', async () => {
    server.use(http.get('/api/health', () => HttpResponse.error()))

    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    )

    expect(await screen.findByText(/API error:/)).toBeInTheDocument()
  })
})
