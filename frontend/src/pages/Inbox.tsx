import { useMemo, useState } from 'react'
import { SearchIcon } from '@/components/brand/icons'
import { FilterChips, type StageFilter } from '@/components/inbox/FilterChips'
import { InboxTable } from '@/components/inbox/InboxTable'
import { ResumeBanner } from '@/components/inbox/ResumeBanner'
import { UploadButton } from '@/components/layout/UploadButton'
import { MapView } from '@/components/submissions/MapView'
import { useHistory } from '@/hooks/useHistory'
import {
  PERMITS,
  permitDepartment,
  type Permit,
  type StageKey,
} from '@/lib/permitData'
import type { HistoryEntry } from '@/lib/types'

type View = 'list' | 'map'

function liveToPermit(e: HistoryEntry): Permit {
  const dept = permitDepartment(e.label)
  const ageDays = Math.max(0, Math.floor((Date.now() - new Date(e.uploaded_at).getTime()) / 86_400_000))
  return {
    id: String(e.id),
    filename: e.filename,
    applicant: e.filename.replace(/\.pdf$/i, ''),
    address: '—',
    neighborhood: '—',
    parcel: '—',
    type: e.label,
    department: dept,
    cost: 0,
    sqft: null,
    received: new Date(e.uploaded_at).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }),
    daysOpen: ageDays,
    stage: ageDays < 1 ? 'processing' : 'ready',
    confidence: e.confidence,
    flags: e.confidence < 0.7 ? ['low_confidence'] : [],
    pages: 0,
  }
}

const EMPTY_COUNTS: Record<StageKey, number> = {
  processing: 0,
  ready: 0,
  rejected: 0,
  complete: 0,
}

export function Inbox() {
  const { entries } = useHistory()
  const [filter, setFilter] = useState<StageFilter>('ready')
  const [view, setView] = useState<View>('list')
  const [search, setSearch] = useState('')
  const [stageOverrides, setStageOverrides] = useState<Record<string, StageKey>>({})
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())

  const all = useMemo<Permit[]>(() => {
    const base = entries.length === 0 ? PERMITS : [...entries.map(liveToPermit), ...PERMITS]
    return base
      .filter((p) => !dismissed.has(p.id))
      .map((p) => (stageOverrides[p.id] ? { ...p, stage: stageOverrides[p.id] } : p))
  }, [entries, stageOverrides, dismissed])

  const counts = useMemo<Record<StageKey, number>>(() => {
    const next = { ...EMPTY_COUNTS }
    for (const p of all) next[p.stage] += 1
    return next
  }, [all])

  const filtered = useMemo(
    () =>
      all.filter((p) => {
        if (filter !== 'all' && p.stage !== filter) return false
        if (search) {
          const q = search.toLowerCase()
          const blob = `${p.applicant} ${p.id} ${p.address} ${p.filename}`.toLowerCase()
          if (!blob.includes(q)) return false
        }
        return true
      }),
    [all, filter, search],
  )

  function handleProcessAnyway(permitId: string) {
    setStageOverrides((prev) => ({ ...prev, [permitId]: 'processing' }))
  }

  function handleDismiss(permitId: string) {
    setDismissed((prev) => {
      const next = new Set(prev)
      next.add(permitId)
      return next
    })
  }

  return (
    <div
      style={{
        padding: 'var(--pad-page)',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, letterSpacing: '-0.01em' }}>
            Inbox
          </h1>
          <p style={{ fontSize: 12, color: 'var(--ink-3)', margin: '4px 0 0' }}>
            {counts.ready === 0
              ? 'No permits ready for review.'
              : `${counts.ready} permit${counts.ready === 1 ? '' : 's'} ready for review.`}
          </p>
        </div>
        <UploadButton size="md" />
      </div>

      <ResumeBanner permits={all} />

      <div
        style={{
          display: 'flex',
          gap: 12,
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        <FilterChips active={filter} onChange={setFilter} counts={counts} />

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            flex: 1,
            maxWidth: 320,
            padding: '0 12px',
            height: 36,
            border: '1px solid var(--line-2)',
            borderRadius: 'var(--r)',
            background: 'var(--surface-card)',
            minWidth: 200,
            boxShadow: 'var(--shadow-1)',
          }}
        >
          <span style={{ color: 'var(--ink-3)' }}>
            <SearchIcon size={14} />
          </span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search applicant, ID, or address…"
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              background: 'transparent',
              fontSize: 13,
            }}
            aria-label="Search permits"
          />
        </div>

        <div style={{ flex: 1 }} />

        <div
          role="tablist"
          aria-label="View mode"
          style={{
            display: 'flex',
            gap: 4,
            padding: 4,
            background: 'var(--surface-sunken)',
            border: '1px solid var(--line-2)',
            borderRadius: 'var(--r)',
          }}
        >
          {([
            { k: 'list' as const, label: 'List' },
            { k: 'map' as const, label: 'Map' },
          ]).map((v) => {
            const isActive = view === v.k
            return (
              <button
                key={v.k}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setView(v.k)}
                style={{
                  height: 28,
                  padding: '0 14px',
                  border: isActive ? '1px solid var(--line-strong)' : '1px solid transparent',
                  cursor: 'pointer',
                  background: isActive ? 'var(--surface-card)' : 'transparent',
                  color: isActive ? 'var(--ink)' : 'var(--ink-2)',
                  fontSize: 12,
                  fontWeight: isActive ? 600 : 500,
                  borderRadius: 6,
                  boxShadow: isActive ? 'var(--shadow-1)' : 'none',
                  transition: 'background .12s var(--ease), color .12s var(--ease)',
                }}
              >
                {v.label}
              </button>
            )
          })}
        </div>
      </div>

      {view === 'list' ? (
        <InboxTable
          permits={filtered}
          showStageColumn={filter === 'all'}
          onProcessAnyway={handleProcessAnyway}
          onDismiss={handleDismiss}
        />
      ) : (
        <MapView permits={filtered} />
      )}
    </div>
  )
}
