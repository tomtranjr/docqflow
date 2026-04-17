import type { UploadItem } from '@/lib/types'
import { PredictionCard } from '@/components/results/PredictionCard'
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react'

interface FileListProps {
  items: UploadItem[]
  onRetry: (id: string) => void
}

export function FileList({ items, onRetry }: FileListProps) {
  if (items.length === 0) return null

  return (
    <div className="mt-6 space-y-2">
      {items.map((item) => (
        <div key={item.id}>
          {item.status === 'uploading' && (
            <div className="flex items-center gap-3 rounded border border-[var(--color-border)] bg-[var(--color-surface-alt)] px-4 py-3">
              <Loader2 className="h-4 w-4 animate-spin text-[var(--color-primary)]" />
              <span className="truncate text-sm">{item.file.name}</span>
              <span className="ml-auto text-xs text-[var(--color-text-secondary)]">
                Classifying...
              </span>
            </div>
          )}
          {item.status === 'idle' && (
            <div className="flex items-center gap-3 rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
              <div className="h-4 w-4 rounded-full border-2 border-[var(--color-border)]" />
              <span className="truncate text-sm">{item.file.name}</span>
              <span className="ml-auto text-xs text-[var(--color-text-secondary)]">Queued</span>
            </div>
          )}
          {item.status === 'done' && item.result && (
            <PredictionCard filename={item.file.name} result={item.result} />
          )}
          {item.status === 'error' && (
            <div className="flex items-center gap-3 rounded border border-[var(--color-error)]/30 bg-[var(--color-error)]/5 px-4 py-3">
              <AlertCircle className="h-4 w-4 text-[var(--color-error)]" />
              <span className="truncate text-sm">{item.file.name}</span>
              <span className="ml-auto text-xs text-[var(--color-error)]">{item.error}</span>
              <button
                type="button"
                onClick={() => onRetry(item.id)}
                aria-label={`Retry classification for ${item.file.name}`}
                title="Retry classification"
                className="ml-2 text-[var(--color-primary)] hover:text-[var(--color-primary-dark)]"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
