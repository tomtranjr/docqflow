import { Outlet } from 'react-router-dom'
import { TopBar } from './TopBar'
import { LeftRail } from './LeftRail'
import { ProcessFlowStrip } from './ProcessFlowStrip'
import { Footer } from './Footer'

export function DashboardShell() {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-surface-base)]">
      <TopBar />
      <div className="flex min-h-0 flex-1">
        <LeftRail />
        <main className="flex min-w-0 flex-1 flex-col">
          <div className="flex-1 px-6 py-6">
            <Outlet />
          </div>
          <ProcessFlowStrip />
        </main>
      </div>
      <Footer />
    </div>
  )
}
