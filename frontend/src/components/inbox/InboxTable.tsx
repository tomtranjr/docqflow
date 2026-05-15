import { Fragment, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRightIcon, UploadIcon, WarnIcon } from '@/components/brand/icons'
import { StagePill } from '@/components/submissions/StagePill'
import { useUpload } from '@/hooks/useUpload'
import { useUploadContext } from '@/context/UploadContext'
import type { Permit } from '@/lib/permitData'

interface InboxTableProps {
  permits: Permit[]
  // Whether to render the Stage column. The Inbox hides it when the user has
  // already filtered to a single stage — the column would just repeat the
  // chip label on every row.
  showStageColumn: boolean
  onProcessAnyway?: (permitId: string) => void
  onDismiss?: (permitId: string) => void
}

// Inline action set for rejected rows. The Re-upload flow piggybacks on the
// existing useUpload pipeline so the new file gets the same gate-check +
// classification treatment as anything dropped through the top-bar upload.
function RejectedActions({
  permit,
  onProcessAnyway,
  onDismiss,
}: {
  permit: Permit
  onProcessAnyway?: (permitId: string) => void
  onDismiss?: (permitId: string) => void
}) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const { addAndProcess } = useUpload()
  const { dispatch } = useUploadContext()

  async function pickFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (files.length === 0) return
    // Drop any in-flight items first so the post-upload navigation lands on
    // the new file, not whatever was queued before.
    dispatch({ type: 'CLEAR' })
    try {
      await addAndProcess(files)
      // Only dismiss once the new upload succeeded. On failure (gate-check
      // reject, network error) the rejected row stays visible so the reviewer
      // can retry without losing the recovery affordance.
      onDismiss?.(permit.id)
    } catch {
      // Swallowed deliberately: addAndProcess surfaces its own toast/error
      // state. We just want to avoid the eager dismiss on failure.
    }
  }

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}
    >
      <button
        type="button"
        className="btn btn-sm"
        onClick={() => inputRef.current?.click()}
      >
        <UploadIcon size={12} /> Re-upload
      </button>
      {onProcessAnyway && (
        <button
          type="button"
          className="btn btn-sm btn-ghost"
          onClick={() => onProcessAnyway(permit.id)}
        >
          Process anyway
        </button>
      )}
      {onDismiss && (
        <button
          type="button"
          className="btn btn-sm btn-ghost"
          onClick={() => onDismiss(permit.id)}
        >
          Dismiss
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        onChange={pickFiles}
        style={{ display: 'none' }}
      />
    </div>
  )
}

export function InboxTable({
  permits,
  showStageColumn,
  onProcessAnyway,
  onDismiss,
}: InboxTableProps) {
  const navigate = useNavigate()
  const [hoverId, setHoverId] = useState<string | null>(null)

  if (permits.length === 0) {
    return (
      <div
        className="card"
        style={{
          padding: '40px 24px',
          textAlign: 'center',
          color: 'var(--ink-3)',
          fontSize: 13,
        }}
      >
        Nothing here. Upload a permit from the toolbar to start.
      </div>
    )
  }

  return (
    <div className="card" style={{ overflow: 'hidden', padding: 0 }}>
      <table className="tbl">
        <thead>
          <tr>
            <th>Permit ID</th>
            <th>Applicant</th>
            <th>Address</th>
            <th>Dept.</th>
            {showStageColumn && <th>State</th>}
            <th>Received</th>
            <th>Days</th>
            <th aria-label="Open" />
          </tr>
        </thead>
        <tbody>
          {permits.map((p) => {
            const isRejected = p.stage === 'rejected'
            const rowClickable = !isRejected
            return (
              <Fragment key={p.id}>
                <tr
                  onClick={rowClickable ? () => navigate(`/app/review/${p.id}`) : undefined}
                  onKeyDown={
                    rowClickable
                      ? (e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            navigate(`/app/review/${p.id}`)
                          }
                        }
                      : undefined
                  }
                  tabIndex={rowClickable ? 0 : -1}
                  onMouseEnter={() => setHoverId(p.id)}
                  onMouseLeave={() => setHoverId((cur) => (cur === p.id ? null : cur))}
                  style={{
                    cursor: rowClickable ? 'pointer' : 'default',
                    background: hoverId === p.id && rowClickable ? 'var(--surface-hover)' : undefined,
                  }}
                >
                  <td>
                    <span className="mono" style={{ fontWeight: 600, color: 'var(--ink)' }}>
                      {p.id}
                    </span>
                  </td>
                  <td>{p.applicant}</td>
                  <td style={{ color: 'var(--ink-3)' }}>{p.address}</td>
                  <td>
                    <span className="pill" style={{ height: 22 }}>
                      {p.department}
                    </span>
                  </td>
                  {showStageColumn && (
                    <td>
                      <StagePill stage={p.stage} />
                    </td>
                  )}
                  <td className="tabular" style={{ color: 'var(--ink-3)' }}>
                    {p.received}
                  </td>
                  <td
                    className="tabular mono"
                    style={{ color: p.daysOpen >= 7 ? 'var(--warn)' : 'var(--ink-3)' }}
                  >
                    {p.daysOpen}d
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {rowClickable ? (
                      <ChevronRightIcon size={14} />
                    ) : (
                      <span style={{ color: 'var(--ink-4)', fontSize: 11 }}>—</span>
                    )}
                  </td>
                </tr>
                {isRejected && (
                  <tr>
                    <td
                      colSpan={showStageColumn ? 8 : 7}
                      style={{
                        background: 'var(--danger-bg)',
                        padding: '10px 16px',
                        borderTop: 'none',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                          flexWrap: 'wrap',
                        }}
                      >
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 8,
                            fontSize: 12,
                            color: 'var(--danger)',
                            flex: 1,
                            minWidth: 0,
                          }}
                        >
                          <WarnIcon size={12} />
                          <span style={{ color: 'var(--ink-2)' }}>
                            {p.rejectReason ?? 'Gate check failed.'}
                          </span>
                        </span>
                        <RejectedActions
                          permit={p}
                          onProcessAnyway={onProcessAnyway}
                          onDismiss={onDismiss}
                        />
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
