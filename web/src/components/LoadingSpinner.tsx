import type { ReactElement } from 'react'

export function LoadingSpinner(): ReactElement {
  return (
    <div role="status" className="flex items-center gap-2 text-zinc-400">
      <svg
        className="h-5 w-5 animate-spin text-emerald-500"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4z"
        />
      </svg>
      <span>Loading projects…</span>
    </div>
  )
}
