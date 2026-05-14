import { useEffect, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { Wordmark } from '@/components/brand/Wordmark'
import {
  BellIcon,
  ChartIcon,
  DashboardIcon,
  DocIcon,
  Icons,
  InboxIcon,
  MoonIcon,
  SearchIcon,
  SettingsIcon,
  SunIcon,
} from '@/components/brand/icons'
import { CommandPalette } from './CommandPalette'
import { NotificationsPanel } from './NotificationsPanel'
import { UploadButton } from './UploadButton'
import { useFirstName, useLastName, usePreferences, useReviewerName } from '@/context/PreferencesContext'
import { useNotifications } from '@/context/NotificationsContext'
import { useSubmissionsCount } from '@/hooks/useSubmissionsCount'

const NAV = [
  { to: '/app', end: true, label: 'Dashboard', icon: DashboardIcon },
  { to: '/app/submissions', end: false, label: 'Submissions', icon: InboxIcon },
  { to: '/app/queue', end: false, label: 'Review', icon: DocIcon },
  { to: '/app/reports', end: false, label: 'Reports', icon: ChartIcon },
  { to: '/app/settings', end: false, label: 'Settings', icon: SettingsIcon },
] as const

const SENTINEL = 'Reviewer'

function resolvedTheme(theme: 'light' | 'dark' | 'system'): 'light' | 'dark' {
  if (theme === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return theme
}

export function TopBar() {
  const reviewerName = useReviewerName()
  const firstName = useFirstName()
  const lastName = useLastName()
  const { theme, setTheme, signOut: clearAuth } = usePreferences()
  const { unreadCount } = useNotifications()
  const submissionsCount = useSubmissionsCount()
  const navigate = useNavigate()
  const [openBell, setOpenBell] = useState(false)
  const [openCmd, setOpenCmd] = useState(false)
  const [openMenu, setOpenMenu] = useState(false)

  const isDark = resolvedTheme(theme) === 'dark'

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpenCmd((v) => !v)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  function toggleTheme() {
    setTheme(isDark ? 'light' : 'dark')
  }

  function signOut() {
    setOpenMenu(false)
    clearAuth()
    navigate('/login')
  }

  const fullName = [firstName, lastName].filter(Boolean).join(' ').trim()
  const display =
    fullName ||
    (reviewerName && reviewerName !== SENTINEL ? reviewerName : 'Reviewer')
  const initials = (
    firstName && lastName
      ? `${firstName[0]}${lastName[0]}`
      : display.slice(0, 2)
  ).toUpperCase()

  return (
    <header
      style={{
        height: 60,
        background: 'var(--surface-card)',
        borderBottom: '1px solid var(--line)',
        boxShadow: isDark ? '0 1px 0 rgba(0,0,0,0.4)' : '0 1px 0 rgba(11,37,69,0.04)',
        display: 'flex',
        alignItems: 'center',
        paddingLeft: 20,
        paddingRight: 16,
        gap: 14,
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}
    >
      <NavLink to="/app" style={{ display: 'inline-flex', alignItems: 'center' }} aria-label="DocQFlow home">
        <Wordmark size={22} onDark={isDark} />
      </NavLink>

      <nav style={{ display: 'flex', height: '100%', marginLeft: 16 }} aria-label="Primary">
        {NAV.map((n) => {
          const Icon = n.icon
          const isSubmissions = n.to === '/app/submissions'
          return (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) => `nav-tab ${isActive ? 'active' : ''}`}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, lineHeight: 1 }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', opacity: 0.85 }}>
                <Icon size={16} />
              </span>
              <span>{n.label}</span>
              {isSubmissions && submissionsCount > 0 && (
                <span
                  aria-label={`${submissionsCount} permits in submissions`}
                  className="mono tabular"
                  style={{
                    minWidth: 18,
                    height: 18,
                    padding: '0 6px',
                    borderRadius: 9,
                    background: 'var(--blue-500)',
                    color: '#fff',
                    fontSize: 10,
                    fontWeight: 700,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    lineHeight: 1,
                  }}
                >
                  {submissionsCount > 99 ? '99+' : submissionsCount}
                </span>
              )}
            </NavLink>
          )
        })}
      </nav>

      <div style={{ flex: 1 }} />

      <button
        type="button"
        onClick={() => setOpenCmd(true)}
        style={{
          height: 32,
          padding: '0 8px 0 10px',
          background: 'var(--surface-sunken)',
          border: '1px solid var(--line)',
          borderRadius: 8,
          color: 'var(--ink-2)',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          fontSize: 12,
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          minWidth: 220,
          flexShrink: 0,
        }}
      >
        <SearchIcon size={14} />
        <span style={{ flex: 1, textAlign: 'left' }}>Search permits…</span>
        <kbd
          style={{
            fontSize: 10,
            fontFamily: 'var(--font-mono)',
            background: 'var(--surface-card)',
            border: '1px solid var(--line)',
            padding: '1px 5px',
            borderRadius: 4,
            color: 'var(--ink-3)',
          }}
        >
          ⌘K
        </kbd>
      </button>

      <UploadButton variant="ghost" label="Upload" />

      <button
        type="button"
        onClick={toggleTheme}
        title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: 'transparent',
          border: 'none',
          color: 'var(--ink-2)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          padding: 0,
          flexShrink: 0,
        }}
      >
        {isDark ? <SunIcon size={18} /> : <MoonIcon size={18} />}
      </button>

      <div style={{ position: 'relative', flexShrink: 0 }}>
        <button
          type="button"
          onClick={() => setOpenBell((v) => !v)}
          aria-label="Notifications"
          aria-expanded={openBell}
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: openBell ? 'var(--surface-sunken)' : 'transparent',
            border: 'none',
            color: 'var(--ink-2)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            cursor: 'pointer',
            padding: 0,
          }}
        >
          <BellIcon size={16} />
          {unreadCount > 0 && (
            <span
              aria-label={`${unreadCount} unread`}
              style={{
                position: 'absolute',
                top: 4,
                right: 5,
                minWidth: 14,
                height: 14,
                borderRadius: 7,
                background: '#E08400',
                border: '1.5px solid var(--surface-card)',
                color: '#fff',
                fontSize: 9,
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0 3px',
              }}
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
        {openBell && <NotificationsPanel onClose={() => setOpenBell(false)} />}
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          paddingLeft: 12,
          borderLeft: '1px solid var(--line)',
          height: 36,
          flexShrink: 0,
          position: 'relative',
        }}
      >
        <button
          type="button"
          onClick={() => setOpenMenu((v) => !v)}
          aria-label="Open user menu"
          aria-expanded={openMenu}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #4D8AF7, #1A4FCC)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontWeight: 700,
              fontSize: 12,
            }}
          >
            {initials}
          </div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              textAlign: 'left',
              lineHeight: 1.2,
              whiteSpace: 'nowrap',
            }}
          >
            <span style={{ color: 'var(--ink)', fontSize: 12, fontWeight: 600 }}>{display}</span>
            <span style={{ color: 'var(--ink-3)', fontSize: 11 }}>Plan Reviewer · DBI</span>
          </div>
          <Icons.chevD size={12} />
        </button>
        {openMenu && (
          <>
            <div onClick={() => setOpenMenu(false)} style={{ position: 'fixed', inset: 0, zIndex: 60 }} />
            <div
              role="menu"
              className="card"
              style={{
                position: 'absolute',
                top: 44,
                right: 0,
                width: 200,
                zIndex: 61,
                boxShadow: 'var(--shadow-pop)',
                padding: 6,
              }}
            >
              <NavLink
                to="/app/settings"
                role="menuitem"
                onClick={() => setOpenMenu(false)}
                style={{
                  display: 'block',
                  padding: '8px 10px',
                  fontSize: 13,
                  borderRadius: 6,
                  color: 'var(--ink-2)',
                }}
              >
                Account settings
              </NavLink>
              <button
                type="button"
                role="menuitem"
                onClick={signOut}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  padding: '8px 10px',
                  fontSize: 13,
                  borderRadius: 6,
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--ink-2)',
                  cursor: 'pointer',
                }}
              >
                Sign out
              </button>
            </div>
          </>
        )}
      </div>

      {openCmd && <CommandPalette onClose={() => setOpenCmd(false)} />}
    </header>
  )
}
