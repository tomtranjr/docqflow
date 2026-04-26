import { useUploadContext } from '@/context/UploadContext'
import { QueueGrid } from '@/components/queue/QueueGrid'

export function Queue() {
  const { queueResults } = useUploadContext()

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <h1 className="text-lg font-semibold text-[var(--color-text-primary)]">
          Classification queue
        </h1>
        <p className="text-sm text-[var(--color-text-secondary)]">
          Recently uploaded documents. Click a thumbnail to review.
        </p>
      </header>
      {queueResults.length === 0 ? (
        <div className="rounded-[var(--radius-md)] border border-dashed border-[var(--color-border)] bg-[var(--color-surface-elev1)] p-8 text-center text-sm text-[var(--color-text-muted)]">
          No documents in the queue. Upload from the dashboard to get started.
        </div>
      ) : (
        <QueueGrid items={queueResults} />
      )}
    </div>
  )
}
