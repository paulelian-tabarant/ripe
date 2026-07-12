import type { ReactElement } from 'react'

interface EmptyStateProps {
  message: string
}

export function EmptyState({ message }: EmptyStateProps): ReactElement {
  return <p className="p-4 text-gray-500">{message}</p>
}
