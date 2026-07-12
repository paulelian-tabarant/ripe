import type { ReactElement } from 'react'

export function LoadingSpinner(): ReactElement {
  return (
    <div role="status" className="flex items-center justify-center p-4">
      <span className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
      <span className="sr-only">Loading projects…</span>
    </div>
  )
}
