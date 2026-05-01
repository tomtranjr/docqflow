import { lazy, Suspense } from 'react'
import { Link } from 'react-router-dom'
import { ClassificationBadge } from '@/components/common/ClassificationBadge'
import { classificationPdfUrl } from '@/lib/api'
import type { PredictionResponse } from '@/lib/types'

const PdfThumbnail = lazy(() => import('@/components/pdf/PdfThumbnail'))

interface QueueThumbnailProps {
  filename: string
  result: PredictionResponse
}

export function QueueThumbnail({ filename, result }: QueueThumbnailProps) {
  return (
    <Link
      to={`/review/${result.id}`}
      className="flex min-w-0 flex-col gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-elev1)] p-3 shadow-[var(--shadow-card)] transition-colors hover:border-[var(--color-brand-accent)]"
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className="truncate text-sm font-medium text-[var(--color-text-primary)]"
          title={filename}
        >
          {filename}
        </span>
        <ClassificationBadge label={result.label} />
      </div>
      <div className="flex h-44 items-center justify-center overflow-hidden rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface-base)]">
        <Suspense
          fallback={<span className="text-xs text-[var(--color-text-muted)]">Loading…</span>}
        >
          <PdfThumbnail url={classificationPdfUrl(result.id)} />
        </Suspense>
      </div>
    </Link>
  )
}
