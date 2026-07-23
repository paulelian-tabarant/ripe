import { render, screen } from '@testing-library/react'
import { http } from 'msw'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { App } from './App'
import { server } from './mocks/server'

describe('App routing', () => {
  it('renders the dashboard page at /', () => {
    server.use(http.get('/api/projects', () => new Promise(() => {})))

    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    )

    expect(screen.getByText('Loading projects…')).toBeInTheDocument()
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
