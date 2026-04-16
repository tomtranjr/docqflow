import { useRouteError, Link } from 'react-router-dom'
import { AlertTriangle } from 'lucide-react'

export function ErrorBoundary() {
  const error = useRouteError() as Error

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
      <AlertTriangle className="h-12 w-12 text-[var(--color-error)]" />
      <h1 className="text-lg font-semibold text-[var(--color-text-primary)]">
        Something went wrong
      </h1>
      <p className="text-sm text-[var(--color-text-secondary)]">
        {error?.message || 'An unexpected error occurred'}
      </p>
      <Link
        to="/"
        className="rounded bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white"
      >
        Go Home
      </Link>
    </div>
  )
}
