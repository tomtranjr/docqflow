import { cn } from '@/lib/utils'

interface ClassificationBadgeProps {
  label: string
}

export function ClassificationBadge({ label }: ClassificationBadgeProps) {
  const isPermit = label === 'permit-3-8'
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-[var(--radius-sm)] px-2 py-0.5 text-xs font-medium',
        isPermit
          ? 'bg-[var(--color-info)]/10 text-[var(--color-info)]'
          : 'bg-[var(--color-text-muted)]/10 text-[var(--color-text-secondary)]',
      )}
    >
      {label}
    </span>
  )
}
