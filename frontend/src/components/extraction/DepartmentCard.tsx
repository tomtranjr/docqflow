import { Building, Zap, Wrench, MapPin, HelpCircle, type LucideIcon } from 'lucide-react'
import { useShowConfidence } from '@/context/PreferencesContext'
import type { Department } from '@/lib/types'
import { DEPARTMENT_LABELS } from './fieldMeta'

const DEPT_ICON: Record<Department, LucideIcon> = {
  building: Building,
  electrical: Zap,
  plumbing: Wrench,
  zoning: MapPin,
  other: HelpCircle,
}

interface DepartmentCardProps {
  department: Department
  confidence: number
  isPlaceholder?: boolean
}

export function DepartmentCard({
  department,
  confidence,
  isPlaceholder = false,
}: DepartmentCardProps) {
  const showConfidence = useShowConfidence()
  const Icon = DEPT_ICON[department]
  const label = DEPARTMENT_LABELS[department]
  const pct = Math.round(confidence * 100)

  return (
    <section className="flex items-center gap-4 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-elev1)] p-4 shadow-[var(--shadow-card)]">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-brand-accent)]/10 text-[var(--color-brand-accent)]">
        <Icon className="h-6 w-6" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
          Auto-Classification
        </span>
        <span className="text-base font-semibold text-[var(--color-text-primary)]">
          {label}
        </span>
        {showConfidence && !isPlaceholder && (
          <span className="text-xs text-[var(--color-confidence-high)]">
            {pct}% confidence
          </span>
        )}
      </div>
      {isPlaceholder && (
        <span
          className="rounded-[var(--radius-sm)] border border-[var(--color-border-strong)] bg-[var(--color-surface-base)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]"
          title="Placeholder data - real LLM extraction lands in PR 3"
        >
          Placeholder
        </span>
      )}
    </section>
  )
}
