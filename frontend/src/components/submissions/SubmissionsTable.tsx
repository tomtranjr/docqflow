import { ConfidenceBadge } from '@/components/results/ConfidenceBadge'
import { ClassificationBadge } from '@/components/common/ClassificationBadge'
import type { HistoryEntry } from '@/lib/types'

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

interface SubmissionsTableProps {
  entries: HistoryEntry[]
}

export function SubmissionsTable({ entries }: SubmissionsTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-[var(--color-border)]">
            <th className="py-3 font-semibold text-[var(--color-text-secondary)]">Filename</th>
            <th className="py-3 font-semibold text-[var(--color-text-secondary)]">Date</th>
            <th className="py-3 font-semibold text-[var(--color-text-secondary)]">
              Classification
            </th>
            <th className="py-3 font-semibold text-[var(--color-text-secondary)]">Confidence</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry, i) => (
            <tr
              key={entry.id}
              className={`h-12 border-b border-[var(--color-border)] transition-colors hover:bg-[var(--color-surface-elev2)] ${
                i % 2 === 1 ? 'bg-[var(--color-surface-elev1)]/50' : ''
              }`}
            >
              <td className="max-w-[300px] truncate py-3" title={entry.filename}>
                {entry.filename}
              </td>
              <td
                className="py-3 text-[var(--color-text-secondary)]"
                title={new Date(entry.uploaded_at).toLocaleString()}
              >
                {formatDate(entry.uploaded_at)}
              </td>
              <td className="py-3">
                <ClassificationBadge label={entry.label} />
              </td>
              <td className="py-3">
                <ConfidenceBadge confidence={entry.confidence} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
