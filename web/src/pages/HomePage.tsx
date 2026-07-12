import type { ReactElement } from 'react'
import { useEffect, useState } from 'react'

interface HealthResponse {
  status: string
}

type HealthState =
  | { kind: 'loading' }
  | { kind: 'success'; status: string }
  | { kind: 'error'; message: string }

async function fetchHealth(): Promise<HealthState> {
  try {
    const response = await fetch('/api/health')
    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`)
    }
    const data = (await response.json()) as HealthResponse
    return { kind: 'success', status: data.status }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return { kind: 'error', message }
  }
}

export function HomePage(): ReactElement {
  const [health, setHealth] = useState<HealthState>({ kind: 'loading' })

  useEffect(() => {
    let cancelled = false

    fetchHealth().then((result) => {
      if (!cancelled) {
        setHealth(result)
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
