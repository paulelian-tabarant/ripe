import { render, screen } from '@testing-library/react'
import { HttpResponse, http } from 'msw'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { App } from './App'
import { server } from './mocks/server'

describe('App routing', () => {
  it('renders the home page at /', () => {
    server.use(http.get('/api/health', () => HttpResponse.json({ status: 'ok' })))

    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    )

    expect(screen.getByText('Hello, World')).toBeInTheDocument()
  })

  it('renders the 404 page for an unknown route', () => {
    render(
      <MemoryRouter initialEntries={['/nope']}>
        <App />
      </MemoryRouter>,
    )

    expect(screen.getByText('404 — page not found')).toBeInTheDocument()
  })
})
