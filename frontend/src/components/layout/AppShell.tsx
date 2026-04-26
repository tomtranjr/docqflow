import { useLocation } from 'react-router-dom'
import { DashboardShell } from './DashboardShell'
import { WorkspaceShell } from './WorkspaceShell'

export function AppShell() {
  const { pathname } = useLocation()
  const isDashboardRoute = pathname === '/app' || pathname === '/app/'
  return isDashboardRoute ? <DashboardShell /> : <WorkspaceShell />
}
