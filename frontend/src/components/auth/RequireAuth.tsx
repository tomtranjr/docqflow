import { Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useIsAuthenticated } from '@/context/PreferencesContext'

interface RequireAuthProps {
  children: ReactNode
}

export function RequireAuth({ children }: RequireAuthProps) {
  const isAuthenticated = useIsAuthenticated()
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }
  return <>{children}</>
}
