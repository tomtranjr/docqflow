import { Link } from 'react-router-dom'
import { CheckCircle2, AlertTriangle } from 'lucide-react'
import type { Notification } from '@/context/NotificationsContext'
import { cn } from '@/lib/utils'

interface NotificationItemProps {
  notification: Notification
  onNavigate?: () => void
}

export function NotificationItem({ notification, onNavigate }: NotificationItemProps) {
  const Icon = notification.kind === 'pass' ? CheckCircle2 : AlertTriangle
  const tone =
    notification.kind === 'pass'
      ? 'text-[var(--color-success)]'
      : 'text-[var(--color-danger)]'

  return (
    <Link
      to={`/app/review/${notification.classificationId}`}
      onClick={onNavigate}
      className={cn(
        'flex items-start gap-2 px-3 py-2 hover:bg-[var(--color-surface-elev2)]',
        !notification.read && 'bg-[var(--color-surface-elev2)]/50',
      )}
    >
      <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', tone)} />
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="truncate text-sm font-medium text-[var(--color-text-primary)]">
          {notification.filename}
        </span>
        <span className="truncate text-xs text-[var(--color-text-secondary)]">
          {notification.message}
        </span>
      </div>
    </Link>
  )
}
