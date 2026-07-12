import type { ReactElement } from 'react'
import { useEffect, useState } from 'react'

interface HealthResponse {
  status: string
}

type HealthState =
  | { kind: 'loading' }
  | { kind: 'success'; status: string }
  | { kind: 'error'; message: string }

export function HomePage(): ReactElement {
  const [health, setHealth] = useState<HealthState>({ kind: 'loading' })

  useEffect(() => {
    let cancelled = false

    fetch('/api/health')
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`)
        }
        return (await response.json()) as HealthResponse
      })
      .then((data) => {
        if (!cancelled) {
          setHealth({ kind: 'success', status: data.status })
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          const message = error instanceof Error ? error.message : 'Unknown error'
          setHealth({ kind: 'error', message })
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div>
      <h1>Hello, World</h1>
      {health.kind === 'loading' && <p>Checking API health…</p>}
      {health.kind === 'success' && <p>API status: {health.status}</p>}
      {health.kind === 'error' && <p>API error: {health.message}</p>}
    </div>
  )
}
