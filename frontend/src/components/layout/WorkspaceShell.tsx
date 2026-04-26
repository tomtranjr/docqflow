import { Outlet } from 'react-router-dom'
import { TopBar } from './TopBar'
import { CollapsedNav } from './CollapsedNav'

export function WorkspaceShell() {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-surface-base)]">
      <TopBar />
      <CollapsedNav />
      <main className="flex-1 px-6 py-6">
        <Outlet />
      </main>
    </div>
  )
}
