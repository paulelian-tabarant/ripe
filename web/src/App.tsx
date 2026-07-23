import type { ReactElement } from 'react'
import { Route, Routes } from 'react-router-dom'
import { DashboardPage } from './pages/DashboardPage'
import { NotFoundPage } from './pages/NotFoundPage'

export function App(): ReactElement {
  return (
    <Routes>
      <Route path="/" element={<DashboardPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
