import { Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useReviewerName } from '@/context/PreferencesContext'

const SENTINEL = 'Reviewer'

interface RequireAuthProps {
  children: ReactNode
}

export function RequireAuth({ children }: RequireAuthProps) {
  const reviewerName = useReviewerName()
  if (!reviewerName || reviewerName === SENTINEL) {
    return <Navigate to="/login" replace />
  }
  return <>{children}</>
}
