import { Link } from 'react-router-dom'
import { FileText, ShieldCheck, Split, MonitorCheck } from 'lucide-react'
import { Logo } from '@/components/common/Logo'
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

export function Landing() {
  return (
    <div className="min-h-screen bg-[var(--color-surface-base)] px-6 py-16">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-12">
        <header className="flex flex-col items-center gap-6 text-center">
          <Logo size="lg" withSlogan />
          <Link
            to="/login"
            className="rounded-[var(--radius-sm)] bg-[var(--color-brand-primary)] px-5 py-2 text-sm font-semibold text-white hover:bg-[var(--color-brand-primary-hover,var(--color-brand-primary))]"
          >
            Sign in
          </Link>
        </header>

        <section className="grid w-full gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {TILES.map((tile) => (
            <MarketingTile key={tile.title} {...tile} />
          ))}
        </section>
      </div>
    </div>
  )
}
