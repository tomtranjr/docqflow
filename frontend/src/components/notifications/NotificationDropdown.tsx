import { Link } from 'react-router-dom'
import { useEffect, useRef } from 'react'
import { useNotifications } from '@/context/NotificationsContext'
import { NotificationItem } from './NotificationItem'

interface NotificationDropdownProps {
  onClose: () => void
}

export function NotificationDropdown({ onClose }: NotificationDropdownProps) {
  const { notifications, markAllRead } = useNotifications()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    markAllRead()
  }, [markAllRead])

  useEffect(() => {
    function onPointer(event: PointerEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('pointerdown', onPointer)
    return () => document.removeEventListener('pointerdown', onPointer)
  }, [onClose])

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label="Recent notifications"
      className="absolute right-0 mt-2 w-80 overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-elev1)] text-[var(--color-text-primary)] shadow-[var(--shadow-elev)]"
    >
      <header className="flex items-center justify-between border-b border-[var(--color-border)] px-3 py-2 text-xs font-semibold text-[var(--color-text-secondary)]">
        <span>Recent activity</span>
        <Link
          to="/app/notifications"
          onClick={onClose}
          className="text-[var(--color-brand-accent)] hover:underline"
        >
          View all
        </Link>
      </header>
      <div className="max-h-80 overflow-y-auto">
        {notifications.length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-[var(--color-text-muted)]">
            No notifications yet.
          </p>
        ) : (
          notifications.slice(0, 10).map((n) => (
            <NotificationItem key={n.id} notification={n} onNavigate={onClose} />
          ))
        )}
      </div>
    </div>
  )
}
