import { useMemo } from 'react'
import { useHistory } from '@/hooks/useHistory'
import { PERMITS, permitDepartment, type Permit } from '@/lib/permitData'

export interface ReviewQueueRow {
  id: string
  applicantOrFilename: string
  address: string | null
  type: string
  department: Permit['department']
  confidence: number
  daysOpen: number
  flags: number
  reviewHref: string
}

interface UseReviewQueueResult {
  rows: ReviewQueueRow[]
  loading: boolean
  isLive: boolean
}

function rowsFromMock(): ReviewQueueRow[] {
  return PERMITS.filter((p) => p.stage === 'review').map((p) => ({
    id: p.id,
    applicantOrFilename: p.applicant,
    address: `${p.address} · ${p.type}`,
    type: p.type,
    department: p.department,
    confidence: p.confidence,
    daysOpen: p.daysOpen,
    flags: p.flags.length,
    reviewHref: `/app/review/${p.id}`,
  }))
}

export function useReviewQueue(): UseReviewQueueResult {
  const { entries, loading } = useHistory()

  const liveRows: ReviewQueueRow[] = useMemo(() => {
    // Days-open is a label, not an invariant — capturing wall-clock here is fine.
    // eslint-disable-next-line react-hooks/purity
    const now = Date.now()
    return entries.map((e) => {
      const dept = permitDepartment(e.label)
      const ageDays = Math.max(0, Math.floor((now - new Date(e.uploaded_at).getTime()) / (1000 * 60 * 60 * 24)))
      return {
        id: String(e.id),
        applicantOrFilename: e.filename,
        address: e.label,
        type: e.label,
        department: dept,
        confidence: e.confidence,
        daysOpen: ageDays,
        flags: 0,
        reviewHref: `/app/review/${e.id}`,
      }
    })
  }, [entries])

  if (liveRows.length > 0) {
    return { rows: liveRows, loading, isLive: true }
  }
  return { rows: rowsFromMock(), loading, isLive: false }
}
