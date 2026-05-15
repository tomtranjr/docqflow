import type { StageKey } from '@/lib/permitData'

export type StageFilter = 'all' | StageKey

interface FilterChipsProps {
  active: StageFilter
  onChange: (next: StageFilter) => void
  counts: Record<StageKey, number>
}

const CHIPS: { key: StageFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'ready', label: 'Ready' },
  { key: 'processing', label: 'Processing' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'complete', label: 'Complete' },
]

export function FilterChips({ active, onChange, counts }: FilterChipsProps) {
  const total = counts.processing + counts.ready + counts.rejected + counts.complete
  return (
    <div
      role="tablist"
      aria-label="Filter by state"
      style={{
        display: 'flex',
        gap: 4,
        padding: 3,
        background: 'var(--surface-sunken)',
        borderRadius: 'var(--r)',
        width: 'fit-content',
      }}
    >
      {CHIPS.map((c) => {
        const isActive = active === c.key
        const count = c.key === 'all' ? total : counts[c.key]
        return (
          <button
            key={c.key}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(c.key)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              height: 30,
              padding: '0 12px',
              border: 'none',
              cursor: 'pointer',
              background: isActive ? 'var(--surface-card)' : 'transparent',
              color: isActive ? 'var(--ink)' : 'var(--ink-3)',
              fontSize: 12,
              fontWeight: 500,
              borderRadius: 6,
              boxShadow: isActive ? 'var(--shadow-1)' : 'none',
            }}
          >
            <span>{c.label}</span>
            <span
              className="mono tabular"
              style={{
                fontSize: 11,
                color: isActive ? 'var(--ink-2)' : 'var(--ink-4)',
                minWidth: 14,
                textAlign: 'right',
              }}
            >
              {count}
            </span>
          </button>
        )
      })}
    </div>
  )
}
