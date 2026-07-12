import type { ReactElement } from 'react'

interface ErrorMessageProps {
  message: string
}

export function ErrorMessage({ message }: ErrorMessageProps): ReactElement {
  return (
    <div role="alert" className="rounded border border-red-300 bg-red-50 p-4 text-red-700">
      {message}
    </div>
  )
}
