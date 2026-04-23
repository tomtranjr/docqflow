import type { PredictionResponse } from '@/lib/types'
import { ConfidenceBadge } from './ConfidenceBadge'

interface PredictionCardProps {
  filename: string
  result: PredictionResponse
}

export function PredictionCard({ filename, result }: PredictionCardProps) {
  const values = Object.values(result.probabilities)
  const confidence = values.length ? Math.max(...values) : 0
  const truncated = filename.length > 40 ? filename.slice(0, 40) + '...' : filename

  return (
    <div className="flex items-center gap-3 rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
      <span className="min-w-0 flex-1 truncate text-sm" title={filename}>
        {truncated}
      </span>
      <span className="shrink-0 rounded border border-[var(--color-border)] bg-[var(--color-surface-alt)] px-2 py-0.5 text-xs font-medium text-[var(--color-text-primary)]">
        {result.label}
      </span>
      <ConfidenceBadge confidence={confidence} />
    </div>
  )
}
