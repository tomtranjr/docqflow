import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { Bell, ChevronDown } from 'lucide-react'
import { useReviewerName, usePreferences } from '@/context/PreferencesContext'
import { useNotifications } from '@/context/NotificationsContext'
import { NotificationDropdown } from '@/components/notifications/NotificationDropdown'
import { Logo } from '@/components/common/Logo'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { to: '/app', label: 'Dashboard', end: true },
  { to: '/app/submissions', label: 'Submissions', end: false },
  { to: '/app/reports', label: 'Reports', end: false },
  { to: '/app/settings', label: 'Settings', end: false },
]

const SENTINEL_NAME = 'Reviewer'

export function TopBar() {
  const reviewerName = useReviewerName()
  const { setReviewerName } = usePreferences()
  const initials = (reviewerName || SENTINEL_NAME).slice(0, 1).toUpperCase()
  const [bellOpen, setBellOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const navigate = useNavigate()
  const { unreadCount } = useNotifications()

  function signOut() {
    setMenuOpen(false)
    setReviewerName(SENTINEL_NAME)
    navigate('/login')
  }

  return (
    <header
      role="banner"
      className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-[var(--color-topbar-border)] bg-[var(--color-topbar-bg)] px-6 text-[var(--color-topbar-text)]"
    >
      <div className="flex items-center gap-3">
        <Logo size="sm" />
      </div>

      <nav className="flex items-center gap-1">
        {NAV_ITEMS.map(({ to, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                'rounded-[var(--radius-sm)] px-3 py-1.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-[var(--color-topbar-active-bg)] text-[var(--color-topbar-text)]'
                  : 'text-[var(--color-topbar-text-muted)] hover:bg-[var(--color-topbar-hover-bg)] hover:text-[var(--color-topbar-text)]',
              )
            }
          >
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="flex items-center gap-3">
        <div className="relative">
          <button
            type="button"
            aria-label="Notifications"
            aria-expanded={bellOpen}
            onClick={() => setBellOpen((v) => !v)}
            className="relative rounded-full p-1.5 text-[var(--color-topbar-text)] hover:bg-[var(--color-topbar-hover-bg)]"
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span
                aria-label={`${unreadCount} unread notifications`}
                className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-[var(--color-danger)] px-1 text-[10px] font-bold text-white"
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
          {bellOpen && <NotificationDropdown onClose={() => setBellOpen(false)} />}
        </div>

        <div className="relative">
          <button
            type="button"
            aria-label="Open user menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-2 rounded-full pr-1 pl-1 py-1 hover:bg-[var(--color-topbar-hover-bg)]"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-xs font-semibold text-[var(--color-brand-primary)]">
              {initials}
            </span>
            <span className="hidden text-sm font-medium md:inline">{reviewerName}</span>
            <ChevronDown className="h-3 w-3 text-[var(--color-topbar-text-muted)]" />
          </button>
          {menuOpen && (
            <div
              role="menu"
              className="absolute right-0 mt-2 w-44 overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-elev1)] text-[var(--color-text-primary)] shadow-[var(--shadow-elev)]"
            >
              <button
                type="button"
                role="menuitem"
                onClick={signOut}
                className="block w-full px-3 py-2 text-left text-sm hover:bg-[var(--color-surface-elev2)]"
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
