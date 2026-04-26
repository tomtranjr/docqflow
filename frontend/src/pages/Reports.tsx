import { useEffect, useState } from 'react'
import { ReportsCards } from '@/components/reports/ReportsCards'
import { ErrorBanner } from '@/components/common/ErrorBanner'
import { getStats } from '@/lib/api'
import type { StatsResponse } from '@/lib/types'

function PermitRatioBar({ counts }: { counts: Record<string, number> }) {
  const permit = counts['permit-3-8'] ?? 0
  const notPermit = counts['not-permit-3-8'] ?? 0
  const total = permit + notPermit
  if (total === 0) return null
  const permitPct = Math.round((permit / total) * 100)
  const notPermitPct = 100 - permitPct
  return (
    <div className="flex flex-col gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-elev1)] p-4 shadow-[var(--shadow-card)]">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
        Permit ratio
      </h2>
      <div
        role="img"
        aria-label={`permit-3-8 ${permitPct}% vs not-permit-3-8 ${notPermitPct}%`}
        className="flex h-3 w-full overflow-hidden rounded-full bg-[var(--color-surface-elev2)]"
      >
        <div
          className="h-full bg-[var(--color-info)]"
          style={{ width: `${permitPct}%` }}
        />
          <div
          className="h-full bg-[var(--color-text-muted)]/40"
          style={{ width: `${notPermitPct}%` }}
        />
      </div>
      <div className="flex justify-between text-xs text-[var(--color-text-secondary)]">
        <span>permit-3-8: {permit}</span>
        <span>not-permit-3-8: {notPermit}</span>
      </div>
    </div>
  )
}

export function Reports() {
  const [stats, setStats] = useState<StatsResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    getStats()
      .then((data) => {
        if (!cancelled) {
          setStats(data)
          setLoading(false)
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load stats')
          setLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold text-[var(--color-text-primary)]">Reports</h1>
      {error && <ErrorBanner title="Could not load stats" description={error} />}
      {!error && stats && (
        <>
          <ReportsCards total={stats.total} recent7d={stats.recent_count_7d} />
          <PermitRatioBar counts={stats.label_counts} />
        </>
      )}
      {loading && !error && (
        <p className="text-sm text-[var(--color-text-muted)]">Loading stats…</p>
      )}
    </div>
  )
}
