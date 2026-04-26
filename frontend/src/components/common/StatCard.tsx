import type { ReactNode } from 'react'

interface StatCardProps {
  icon: ReactNode
  label: string
  value: string | number
}

export function StatCard({ icon, label, value }: StatCardProps) {
  return (
    <div className="flex items-center gap-4 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-elev1)] p-4 shadow-[var(--shadow-card)]">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-brand-accent)]/10 text-[var(--color-brand-accent)]">
        {icon}
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
          {label}
        </span>
        <span className="text-2xl font-bold text-[var(--color-text-primary)]">{value}</span>
      </div>
    </div>
  )
}
