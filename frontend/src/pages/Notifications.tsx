import { Link } from 'react-router-dom'
import { useNotifications, type Notification } from '@/context/NotificationsContext'

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

export function Notifications() {
  const { notifications, clear, markAllRead } = useNotifications()

  return (
    <div style={{ padding: 'var(--pad-page)', display: 'flex', flexDirection: 'column', gap: 18, maxWidth: 880, margin: '0 auto', width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div className="label-eyebrow" style={{ marginBottom: 4 }}>Inbox</div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, letterSpacing: '-0.01em' }}>Notifications</h1>
          <p style={{ fontSize: 13, color: 'var(--ink-3)', margin: '4px 0 0' }}>
            {notifications.length} item{notifications.length === 1 ? '' : 's'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="btn" onClick={markAllRead}>Mark all read</button>
          <button type="button" className="btn" onClick={clear} disabled={notifications.length === 0}>Clear all</button>
        </div>
      </div>

      {notifications.length === 0 ? (
        <div className="card" style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>
          No notifications yet. Upload a permit document to see completeness checks here.
        </div>
      ) : (
        <ul className="card" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {notifications.map((n) => (
            <li key={n.id} style={{ borderBottom: '1px solid var(--line)' }}>
              <Link
                to={`/app/review/${n.classificationId}`}
                style={{
                  display: 'flex',
                  gap: 12,
                  padding: '14px 18px',
                  textDecoration: 'none',
                  color: 'inherit',
                  background: n.read ? 'transparent' : 'var(--blue-50)',
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: dotColor(n),
                    marginTop: 6,
                    flexShrink: 0,
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{n.filename}</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>{n.message}</div>
                  <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 4 }}>{formatRelative(n.createdAt)}</div>
                </div>
                <span className={`pill ${n.kind === 'fail' ? 'pill-warn' : 'pill-success'}`} style={{ height: 20, fontSize: 10 }}>
                  {n.kind === 'fail' ? 'Needs review' : 'Pass'}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
