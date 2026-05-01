import { useNavigate } from 'react-router-dom'
import { ConfMini } from '@/components/dashboard/ConfMini'
import { DocAvatar } from '@/components/dashboard/DocAvatar'
import type { ReviewQueueRow as ReviewQueueRowData } from '@/hooks/useReviewQueue'

interface ReviewQueueRowProps {
  row: ReviewQueueRowData
  isLast: boolean
}

export function ReviewQueueRow({ row, isLast }: ReviewQueueRowProps) {
  const navigate = useNavigate()

  return (
    <button
      type="button"
      onClick={() => navigate(row.reviewHref)}
      style={{
        display: 'grid',
        gridTemplateColumns: 'auto 1fr auto auto auto',
        gap: 16,
        alignItems: 'center',
        width: '100%',
        textAlign: 'left',
        padding: '14px 20px',
        background: 'transparent',
        border: 'none',
        borderBottom: isLast ? 'none' : '1px solid var(--line)',
        cursor: 'pointer',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-hover)')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      <DocAvatar dept={row.department} />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
          {row.applicantOrFilename} ·{' '}
          <span className="mono" style={{ color: 'var(--ink-3)', fontWeight: 400 }}>
            {row.id}
          </span>
        </div>
        <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>{row.address}</div>
      </div>
      <ConfMini value={row.confidence} />
      <span className="pill" style={{ fontSize: 10 }}>
        {row.daysOpen === 0 ? 'Today' : `${row.daysOpen}d open`}
      </span>
      {row.flags > 0 ? (
        <span className="pill pill-warn pill-dot" style={{ fontSize: 10 }}>
          {row.flags}
        </span>
      ) : (
        <span style={{ width: 1 }} />
      )}
    </button>
  )
}
