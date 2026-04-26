import { FileText, ShieldCheck, Split, MonitorCheck } from 'lucide-react'
import { MarketingTile } from '@/components/dashboard/MarketingTile'

const TILES = [
  {
    icon: FileText,
    title: 'Document Field Extraction',
    description: 'Pull permit fields out of every PDF automatically.',
  },
  {
    icon: ShieldCheck,
    title: 'Completeness Check',
    description: 'Flag missing fields before they reach a reviewer.',
  },
  {
    icon: Split,
    title: 'Auto-classification',
    description: 'Route to Building, Electrical, Plumbing, or Zoning.',
  },
  {
    icon: MonitorCheck,
    title: 'Review Dashboard',
    description: 'One workspace for every pending submission.',
  },
]

export function LeftRail() {
  return (
    <aside
      aria-label="DocQFlow features"
      className="hidden w-[280px] shrink-0 flex-col gap-4 border-r border-[var(--color-border)] bg-[var(--color-surface-base)] p-6 lg:flex"
    >
      <div className="flex flex-col gap-1 pb-2">
        <span className="text-2xl font-extrabold tracking-tight">
          <span className="text-[var(--color-brand-primary)]">DOCQ</span>
          <span className="text-[var(--color-brand-accent)]">FLOW</span>
        </span>
        <p className="text-xs text-[var(--color-text-muted)]">
          Permit document review, simplified.
        </p>
      </div>
      {TILES.map((tile) => (
        <MarketingTile key={tile.title} {...tile} />
      ))}
    </aside>
  )
}
