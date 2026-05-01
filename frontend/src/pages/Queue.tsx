import { useMemo } from 'react'
import { useUploadContext } from '@/context/UploadContext'
import { ReviewQueueRow } from '@/components/queue/ReviewQueueRow'
import { permitDepartment } from '@/lib/permitData'
import type { ReviewQueueRow as ReviewQueueRowData } from '@/hooks/useReviewQueue'
import type { QueuedResult } from '@/lib/types'

function toRow(q: QueuedResult): ReviewQueueRowData {
  const confidence = q.result.probabilities[q.result.label] ?? 0
  return {
    id: String(q.result.id),
    applicantOrFilename: q.filename,
    address: q.result.label,
    type: q.result.label,
    department: permitDepartment(q.result.label),
    confidence,
    daysOpen: 0,
    flags: 0,
    reviewHref: `/app/review/${q.result.id}`,
  }
}

export function Queue() {
  const { queueResults } = useUploadContext()
  const rows = useMemo(() => queueResults.map(toRow), [queueResults])

  return (
    <div style={{ padding: 'var(--pad-page)', display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div>
        <div className="label-eyebrow" style={{ marginBottom: 4 }}>Review</div>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, letterSpacing: '-0.01em' }}>
          Classification queue
        </h1>
        <p style={{ fontSize: 13, color: 'var(--ink-3)', margin: '4px 0 0' }}>
          {rows.length === 0
            ? 'Recently uploaded documents. Click a row to review.'
            : `${rows.length} document${rows.length === 1 ? '' : 's'} ready for review`}
        </p>
      </div>

      {rows.length === 0 ? (
        <div
          className="card"
          style={{
            padding: '32px 24px',
            textAlign: 'center',
            color: 'var(--ink-3)',
            fontSize: 13,
          }}
        >
          No documents in the queue. Upload from the dashboard to get started.
        </div>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          {rows.map((row, i) => (
            <ReviewQueueRow key={row.id} row={row} isLast={i === rows.length - 1} />
          ))}
        </div>
      )}
    </div>
  )
}
