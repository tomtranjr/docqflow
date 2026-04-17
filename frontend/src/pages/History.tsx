import { useHistory } from '@/hooks/useHistory'
import { ConfidenceBadge } from '@/components/results/ConfidenceBadge'
import { EmptyState } from '@/components/shared/EmptyState'
import { SkeletonCard } from '@/components/shared/SkeletonCard'
import { Search, ChevronLeft, ChevronRight, FileText } from 'lucide-react'

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

export function History() {
  const { entries, total, page, setPage, label, setLabel, search, setSearch, loading } =
    useHistory()
  const totalPages = Math.ceil(total / 25)

  return (
    <div>
      <h1 className="mb-6 text-xl font-bold text-[var(--color-text-primary)]">
        Classification History
      </h1>

      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-secondary)]" />
          <input
            type="text"
            aria-label="Search history by filename"
            placeholder="Search by filename..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            className="w-full rounded border border-[var(--color-border)] bg-[var(--color-surface)] py-2 pl-9 pr-3 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:border-[var(--color-primary)] focus:outline-none"
          />
        </div>
        <select
          aria-label="Filter history by classification label"
          value={label}
          onChange={(e) => {
            setLabel(e.target.value)
            setPage(1)
          }}
          className="rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:border-[var(--color-primary)] focus:outline-none"
        >
          <option value="">All labels</option>
          <option value="permit-3-8">permit-3-8</option>
          <option value="not-permit-3-8">not-permit-3-8</option>
        </select>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }, (_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <EmptyState
          icon={FileText}
          message="No classification history yet"
          actionLabel="Classify Documents"
          actionTo="/"
        />
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)]">
                  <th className="py-3 font-semibold text-[var(--color-text-secondary)]">
                    Filename
                  </th>
                  <th className="py-3 font-semibold text-[var(--color-text-secondary)]">Date</th>
                  <th className="py-3 font-semibold text-[var(--color-text-secondary)]">
                    Classification
                  </th>
                  <th className="py-3 font-semibold text-[var(--color-text-secondary)]">
                    Confidence
                  </th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry, i) => (
                  <tr
                    key={entry.id}
                    className={`h-12 border-b border-[var(--color-border)] transition-colors hover:bg-[var(--color-surface-alt)] ${i % 2 === 1 ? 'bg-[var(--color-surface-alt)]/50' : ''}`}
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
                      <span className="rounded border border-[var(--color-border)] bg-[var(--color-surface-alt)] px-2 py-0.5 text-xs font-medium">
                        {entry.label}
                      </span>
                    </td>
                    <td className="py-3">
                      <ConfidenceBadge confidence={entry.confidence} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <span className="text-xs text-[var(--color-text-secondary)]">
                Page {page} of {totalPages} ({total} total)
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page <= 1}
                  className="flex items-center gap-1 rounded border border-[var(--color-border)] px-3 py-1.5 text-xs font-medium disabled:opacity-50"
                >
                  <ChevronLeft className="h-3 w-3" /> Previous
                </button>
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page >= totalPages}
                  className="flex items-center gap-1 rounded border border-[var(--color-border)] px-3 py-1.5 text-xs font-medium disabled:opacity-50"
                >
                  Next <ChevronRight className="h-3 w-3" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
