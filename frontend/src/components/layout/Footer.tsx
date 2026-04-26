import { Link } from 'react-router-dom'

export function Footer() {
  return (
    <footer className="flex items-center justify-between border-t border-[var(--color-border)] bg-[var(--color-surface-elev1)] px-6 py-3 text-xs text-[var(--color-text-muted)]">
      <span>DocQFlow — permit document review</span>
      <Link to="/about" className="hover:text-[var(--color-brand-accent)]">
        About
      </Link>
    </footer>
  )
}
