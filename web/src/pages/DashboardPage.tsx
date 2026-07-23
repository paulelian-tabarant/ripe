import type { ReactElement } from 'react'
import { useEffect } from 'react'
import { LoadingSpinner } from '../components/LoadingSpinner'

export function DashboardPage(): ReactElement {
  useEffect(() => {
    fetch('/api/projects')
  }, [])

  return <LoadingSpinner />
}
