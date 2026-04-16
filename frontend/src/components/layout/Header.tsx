import { Link, useLocation } from 'react-router-dom'
import { ThemeToggle } from './ThemeToggle'
import { cn } from '@/lib/utils'
import { FileText, Menu, X } from 'lucide-react'
import { useState } from 'react'

const NAV_ITEMS = [
  { to: '/', label: 'Classify' },
  { to: '/history', label: 'History' },
  { to: '/about', label: 'About' },
]

export function Header() {
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 h-14 border-b border-[var(--color-border)] bg-[var(--color-primary-dark)]">
      <div className="mx-auto flex h-full max-w-[1200px] items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-2 text-lg font-bold text-white">
          <FileText className="h-5 w-5" />
          DocQFlow
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {NAV_ITEMS.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              className={cn(
                'text-sm font-medium text-white/70 transition-colors hover:text-white',
                location.pathname === to &&
                  'border-b-2 border-white pb-0.5 font-semibold text-white',
              )}
            >
              {label}
            </Link>
          ))}
          <ThemeToggle />
        </nav>

        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="text-white md:hidden"
          aria-label="Toggle menu"
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {menuOpen && (
        <nav className="border-b border-[var(--color-border)] bg-[var(--color-primary-dark)] px-6 py-4 md:hidden">
          {NAV_ITEMS.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              onClick={() => setMenuOpen(false)}
              className="block py-2 text-sm text-white/70 hover:text-white"
            >
              {label}
            </Link>
          ))}
          <div className="pt-2">
            <ThemeToggle />
          </div>
        </nav>
      )}
    </header>
  )
}
