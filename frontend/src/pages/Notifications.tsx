import { useNotifications } from '@/context/NotificationsContext'
import { NotificationItem } from '@/components/notifications/NotificationItem'

export function Notifications() {
  const { notifications, clear } = useNotifications()

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-[var(--color-text-primary)]">Notifications</h1>
        {notifications.length > 0 && (
          <button
            type="button"
            onClick={clear}
            className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-danger)]"
          >
            Clear all
          </button>
        )}
      </header>
      {notifications.length === 0 ? (
        <p className="rounded-[var(--radius-md)] border border-dashed border-[var(--color-border)] bg-[var(--color-surface-elev1)] px-4 py-12 text-center text-sm text-[var(--color-text-muted)]">
          No notifications. Upload a permit document to see check results here.
        </p>
      ) : (
        <ul className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-elev1)]">
          {notifications.map((n) => (
            <li key={n.id} className="border-b border-[var(--color-border)] last:border-b-0">
              <NotificationItem notification={n} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
