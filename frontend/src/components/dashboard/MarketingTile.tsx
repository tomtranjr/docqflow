import type { LucideIcon } from 'lucide-react'

interface MarketingTileProps {
  icon: LucideIcon
  title: string
  description: string
}

export function MarketingTile({ icon: Icon, title, description }: MarketingTileProps) {
  return (
    <div className="flex flex-col gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-elev1)] p-4 shadow-[var(--shadow-card)]">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-brand-accent)]/10 text-[var(--color-brand-accent)]">
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex flex-col gap-1">
        <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">{title}</h3>
        <p className="text-xs text-[var(--color-text-secondary)]">{description}</p>
      </div>
    </div>
  )
}
