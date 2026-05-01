import { useNotifications, type Notification } from '@/context/NotificationsContext'
import { Link } from 'react-router-dom'

interface NotificationsPanelProps {
  onClose: () => void
}

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime()
  const diff = Math.max(0, Date.now() - then)
  const m = Math.floor(diff / 60_000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}

function dotColor(n: Notification): string {
  return n.kind === 'fail' ? 'var(--warn)' : 'var(--ok)'
}

export function NotificationsPanel({ onClose }: NotificationsPanelProps) {
  const { notifications, markAllRead } = useNotifications()
  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 60 }} />
      <div
        className="card"
        style={{
          position: 'absolute',
          top: 44,
          right: 0,
          width: 340,
          zIndex: 61,
          boxShadow: 'var(--shadow-pop)',
        }}
      >
        <div
          style={{
            padding: '12px 14px',
            borderBottom: '1px solid var(--line)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span style={{ fontWeight: 600, fontSize: 13 }}>Notifications</span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={markAllRead}>
            Mark all read
          </button>
        </div>
        {notifications.length === 0 ? (
          <div style={{ padding: '24px 14px', fontSize: 12, color: 'var(--ink-3)', textAlign: 'center' }}>
            You&apos;re all caught up.
          </div>
        ) : (
          notifications.slice(0, 6).map((n) => (
            <Link
              key={n.id}
              to={`/app/review/${n.classificationId}`}
              onClick={onClose}
              style={{
                display: 'flex',
                gap: 10,
                padding: '12px 14px',
                borderBottom: '1px solid var(--line)',
                textDecoration: 'none',
                color: 'inherit',
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  marginTop: 6,
                  background: dotColor(n),
                  flexShrink: 0,
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{n.filename}</div>
                <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>{n.message}</div>
                <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 4 }}>{formatRelative(n.createdAt)}</div>
              </div>
            </Link>
          ))
        )}
        <div style={{ padding: '10px 14px', borderTop: '1px solid var(--line)', textAlign: 'center' }}>
          <Link to="/app/notifications" onClick={onClose} style={{ fontSize: 12, fontWeight: 600, color: 'var(--blue-500)' }}>
            View all notifications
          </Link>
        </div>
      </div>
    </>
  )
}
