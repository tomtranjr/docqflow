import { NavLink } from 'react-router-dom'
import { Bell, FileText } from 'lucide-react'
import { useReviewerName } from '@/context/PreferencesContext'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/submissions', label: 'Submissions', end: false },
  { to: '/reports', label: 'Reports', end: false },
  { to: '/settings', label: 'Settings', end: false },
]

export function TopBar() {
  const reviewerName = useReviewerName()
  const initials = reviewerName.slice(0, 1).toUpperCase()

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface-elev1)] px-6">
      <div className="flex items-center gap-2">
        <FileText className="h-5 w-5 text-[var(--color-brand-accent)]" />
        <span className="text-base font-extrabold tracking-tight">
          <span className="text-[var(--color-brand-primary)]">DOCQ</span>
          <span className="text-[var(--color-brand-accent)]">FLOW</span>
        </span>
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
                  ? 'bg-[var(--color-brand-accent)]/10 text-[var(--color-brand-accent)]'
                  : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-elev2)]',
              )
            }
          >
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label="Notifications"
          className="relative rounded-full p-1.5 text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-elev2)]"
        >
          <Bell className="h-4 w-4" />
        </button>
        <div
          className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-brand-primary)] text-xs font-semibold text-white"
          aria-label={`User: ${reviewerName}`}
        >
          {initials}
        </div>
      </div>
    </header>
  )
}
