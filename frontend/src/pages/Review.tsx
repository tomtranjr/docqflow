import { lazy, Suspense, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { ExtractedFieldsPanel } from '@/components/extraction/ExtractedFieldsPanel'
import { DepartmentCard } from '@/components/extraction/DepartmentCard'
import { ActionBar } from '@/components/extraction/ActionBar'
import { ClassificationBadge } from '@/components/common/ClassificationBadge'
import { ErrorBanner } from '@/components/common/ErrorBanner'
import { usePlaceholderExtraction } from '@/hooks/usePlaceholderExtraction'
import { classificationPdfUrl, getClassification } from '@/lib/api'
import type { HistoryEntry } from '@/lib/types'

const PdfViewer = lazy(() => import('@/components/pdf/PdfViewer'))

export function Review() {
  const { id } = useParams<{ id: string }>()
  const numericId = id ? Number(id) : Number.NaN
  const idIsValid = Number.isFinite(numericId)
  const [entry, setEntry] = useState<HistoryEntry | null>(null)
  const [error, setError] = useState<string | null>(null)
  const extraction = usePlaceholderExtraction(id ?? '')

  useEffect(() => {
    if (!idIsValid) return
    let cancelled = false
    getClassification(numericId)
      .then((data) => {
        if (!cancelled) setEntry(data)
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load classification')
        }
      })
    return () => {
      cancelled = true
    }
  }, [idIsValid, numericId])

  if (!idIsValid) {
    return (
      <ErrorBanner
        title="Invalid classification"
        description="The classification id in the URL is not valid."
      />
    )
  }

  if (error) {
    return <ErrorBanner title="Could not load classification" description={error} />
  }

  return (
    <div className="flex flex-col gap-4">
      {entry && (
        <header className="flex flex-wrap items-center gap-3">
          <h1 className="text-lg font-semibold text-[var(--color-text-primary)]">
            {entry.filename}
          </h1>
          <ClassificationBadge label={entry.label} />
        </header>
      )}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
        <div className="min-w-0">
          <Suspense
            fallback={
              <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-elev1)] p-6 text-sm text-[var(--color-text-muted)]">
                Loading PDF viewer…
              </div>
            }
          >
            <PdfViewer url={classificationPdfUrl(numericId)} />
          </Suspense>
        </div>
        <aside className="flex min-w-0 flex-col gap-4">
          <ExtractedFieldsPanel state={extraction} />
          {extraction.kind === 'ok' && (
            <DepartmentCard
              department={extraction.result.department}
              confidence={extraction.result.department_confidence}
              isPlaceholder={extraction.result.model === 'placeholder'}
            />
          )}
          <ActionBar />
        </aside>
      </div>
    </div>
  )
}
