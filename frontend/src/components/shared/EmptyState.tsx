import type { LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'

interface EmptyStateProps {
  icon: LucideIcon
  message: string
  actionLabel?: string
  actionTo?: string
}

export function EmptyState({ icon: Icon, message, actionLabel, actionTo }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-4 py-16 text-center">
      <Icon className="h-12 w-12 text-[var(--color-text-secondary)]" />
      <p className="text-sm text-[var(--color-text-secondary)]">{message}</p>
      {actionLabel && actionTo && (
        <Link
          to={actionTo}
          className="rounded bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          {actionLabel}
        </Link>
      )}
    </div>
  )
}
