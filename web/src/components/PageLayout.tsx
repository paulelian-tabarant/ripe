import type { ReactElement } from 'react'
import { Outlet } from 'react-router-dom'

export function PageLayout(): ReactElement {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
        <Outlet />
      </div>
    </div>
  )
}
