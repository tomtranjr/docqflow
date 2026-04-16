import type { UploadItem } from '@/lib/types'

interface BatchProgressProps {
  items: UploadItem[]
  onClear: () => void
  onDownloadCSV: () => void
}

export function BatchProgress({ items, onClear, onDownloadCSV }: BatchProgressProps) {
  if (items.length === 0) return null

  const done = items.filter((i) => i.status === 'done').length
  const errors = items.filter((i) => i.status === 'error').length
  const total = items.length
  const allDone = done + errors === total

  const labelCounts: Record<string, number> = {}
  for (const item of items) {
    if (item.result) {
      const label = item.result.label
      labelCounts[label] = (labelCounts[label] || 0) + 1
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded border border-[var(--color-border)] bg-[var(--color-surface-alt)] px-4 py-3">
      <span className="text-sm font-semibold text-[var(--color-text-primary)]">
        {allDone
          ? `${done} file${done !== 1 ? 's' : ''} classified`
          : `Processing ${done} of ${total} files`}
        {allDone && Object.keys(labelCounts).length > 0 && (
          <span className="font-normal text-[var(--color-text-secondary)]">
            {' - '}
            {Object.entries(labelCounts)
              .map(([label, count]) => `${count} ${label}`)
              .join(', ')}
          </span>
        )}
      </span>
      {!allDone && (
        <div className="ml-auto h-2 w-32 rounded-full bg-[var(--color-border)]">
          <div
            className="h-full rounded-full bg-[var(--color-primary)] transition-all duration-300"
            style={{ width: `${(done / total) * 100}%` }}
          />
        </div>
      )}
      {allDone && (
        <div className="ml-auto flex gap-2">
          <button
            onClick={onDownloadCSV}
            className="rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1 text-xs font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-surface-alt)]"
          >
            Download CSV
          </button>
          <button
            onClick={onClear}
            className="rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1 text-xs font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-alt)]"
          >
            Clear
          </button>
        </div>
      )}
    </div>
  )
}
