import { Outlet } from 'react-router-dom'
import { Header } from './Header'

export function Shell() {
  return (
    <div className="min-h-screen bg-[var(--color-surface)]">
      <Header />
      <main className="mx-auto max-w-[1200px] px-6 py-8">
        <Outlet />
      </main>
    </div>
  )
}
