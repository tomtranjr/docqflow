import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowIcon } from '@/components/brand/icons'
import type { Permit } from '@/lib/permitData'

interface ResumeBannerProps {
  permits: Permit[]
}

interface LastReview {
  id: string
  savedAt: number
}

function readLastReview(): LastReview | null {
  try {
    const raw = window.localStorage.getItem('docqflow:last-review')
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<LastReview>
    if (typeof parsed?.id !== 'string') return null
    return { id: parsed.id, savedAt: Number(parsed.savedAt) || 0 }
  } catch {
    return null
  }
}

function clearLastReview() {
  try {
    window.localStorage.removeItem('docqflow:last-review')
  } catch {
    // localStorage may be unavailable; nothing to clean up in that case.
  }
}

function formatAge(savedAt: number): string {
  const ms = Date.now() - savedAt
  if (ms < 60_000) return 'just now'
  const minutes = Math.floor(ms / 60_000)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

// Shows a one-line "Resume X" strip if the user has a previously opened
// review that is still waiting for them (stage === 'ready'). Hidden silently
// otherwise — the goal is zero clutter when there's nothing to resume.
export function ResumeBanner({ permits }: ResumeBannerProps) {
  const navigate = useNavigate()
  // Lazy initializer reads localStorage once on mount. We never need to react
  // to storage changes during a session — the value gets refreshed naturally
  // when the user navigates back from Review.
  const [last, setLast] = useState<LastReview | null>(() => readLastReview())

  if (!last) return null
  const permit = permits.find((p) => p.id === last.id)
  if (!permit || permit.stage !== 'ready') return null

  function dismiss() {
    clearLastReview()
    setLast(null)
  }

  return (
    <div
      className="card"
      style={{
        padding: '10px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        background: 'var(--info-bg)',
        borderColor: 'var(--info)',
      }}
      role="status"
    >
      <span style={{ fontSize: 13, color: 'var(--ink-2)', flex: 1, minWidth: 0 }}>
        <span style={{ fontWeight: 600, color: 'var(--ink)' }}>Resume</span>{' '}
        <span className="mono">{permit.id}</span>
        <span style={{ color: 'var(--ink-3)' }}> · {permit.applicant} · </span>
        <span style={{ color: 'var(--ink-4)' }}>opened {formatAge(last.savedAt)}</span>
      </span>
      <button
        type="button"
        className="btn btn-sm btn-accent"
        onClick={() => navigate(`/app/review/${permit.id}`)}
      >
        Resume <ArrowIcon size={12} />
      </button>
      <button
        type="button"
        className="btn btn-sm btn-ghost"
        onClick={dismiss}
        aria-label="Dismiss resume banner"
      >
        Dismiss
      </button>
    </div>
  )
}
