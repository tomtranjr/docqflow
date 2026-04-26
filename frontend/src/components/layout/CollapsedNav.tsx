import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export function CollapsedNav() {
  return (
    <div className="flex h-10 items-center border-b border-[var(--color-border)] bg-[var(--color-surface-elev1)] px-6">
      <Link
        to="/app"
        className="inline-flex items-center gap-2 text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-brand-accent)]"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Dashboard
      </Link>
    </div>
  )
}
