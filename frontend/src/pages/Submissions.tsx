import { useMemo, useState } from 'react'
import { DownloadIcon, SearchIcon, UploadIcon } from '@/components/brand/icons'
import { KanbanBoard } from '@/components/submissions/KanbanBoard'
import { SubmissionsTable } from '@/components/submissions/SubmissionsTable'
import { MapView } from '@/components/submissions/MapView'
import { UploadButton } from '@/components/layout/UploadButton'
import { useHistory } from '@/hooks/useHistory'
import { PERMITS, permitDepartment, type Permit, type StageKey } from '@/lib/permitData'
import type { HistoryEntry } from '@/lib/types'

type View = 'board' | 'table' | 'map'
type DeptFilter = 'all' | Permit['department']

function liveToPermit(e: HistoryEntry): Permit {
  const dept = permitDepartment(e.label)
  const ageDays = Math.max(0, Math.floor((Date.now() - new Date(e.uploaded_at).getTime()) / 86_400_000))
  const stage: StageKey = ageDays === 0 ? 'extract' : ageDays < 2 ? 'validate' : 'review'
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
    received: new Date(e.uploaded_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    daysOpen: ageDays,
    stage,
    confidence: e.confidence,
    flags: e.confidence < 0.7 ? ['low_confidence'] : [],
    pages: 0,
  }
}

export function Submissions() {
  const [view, setView] = useState<View>('board')
  const [filter, setFilter] = useState<DeptFilter>('all')
  const [search, setSearch] = useState('')
  const [stageOverrides, setStageOverrides] = useState<Record<string, StageKey>>({})
  const { entries } = useHistory()

  const all = useMemo<Permit[]>(() => {
    const base = entries.length === 0 ? PERMITS : [...entries.map(liveToPermit), ...PERMITS]
    return base.map((p) =>
      stageOverrides[p.id] ? { ...p, stage: stageOverrides[p.id] } : p
    )
  }, [entries, stageOverrides])

  function handleMoveStage(permitId: string, newStage: StageKey) {
    setStageOverrides((prev) => ({ ...prev, [permitId]: newStage }))
  }

  const filtered = all.filter((p) => {
    if (filter !== 'all' && p.department !== filter) return false
    if (search) {
      const q = search.toLowerCase()
      const blob = `${p.applicant} ${p.id} ${p.address} ${p.filename}`.toLowerCase()
      if (!blob.includes(q)) return false
    }
    return true
  })

  return (
    <div style={{ padding: 'var(--pad-page)', display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div className="label-eyebrow" style={{ marginBottom: 4 }}>Pipeline</div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, letterSpacing: '-0.01em' }}>Submissions</h1>
          <p style={{ fontSize: 13, color: 'var(--ink-3)', margin: '4px 0 0' }}>
            {filtered.length} permits · 5 stages · live + demo data
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button type="button" className="btn">
            <DownloadIcon size={14} /> Export CSV
          </button>
          <UploadButton size="md" />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            flex: 1,
            maxWidth: 360,
            padding: '0 12px',
            height: 36,
            border: '1px solid var(--line)',
            borderRadius: 'var(--r)',
            background: 'var(--surface-card)',
            minWidth: 220,
          }}
        >
          <span style={{ color: 'var(--ink-3)' }}>
            <SearchIcon size={14} />
          </span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search applicant, ID, or address…"
            style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 13 }}
            aria-label="Search permits"
          />
        </div>

        <div style={{ display: 'flex', gap: 4, padding: 3, background: 'var(--surface-sunken)', borderRadius: 'var(--r)' }}>
          {(['all', 'Building', 'Electrical', 'Plumbing', 'Zoning'] as const).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setFilter(d)}
              style={{
                height: 28,
                padding: '0 12px',
                border: 'none',
                cursor: 'pointer',
                background: filter === d ? 'var(--surface-card)' : 'transparent',
                color: filter === d ? 'var(--ink)' : 'var(--ink-3)',
                fontSize: 12,
                fontWeight: 500,
                borderRadius: 6,
                boxShadow: filter === d ? 'var(--shadow-1)' : 'none',
              }}
            >
              {d === 'all' ? 'All' : d}
            </button>
          ))}
        </div>

        <div style={{ flex: 1 }} />

        <div style={{ display: 'flex', gap: 4, padding: 3, background: 'var(--surface-sunken)', borderRadius: 'var(--r)' }}>
          {(
            [
              { k: 'board', label: 'Board' },
              { k: 'table', label: 'Table' },
              { k: 'map', label: 'Map' },
            ] as const
          ).map((v) => (
            <button
              key={v.k}
              type="button"
              onClick={() => setView(v.k)}
              style={{
                height: 28,
                padding: '0 12px',
                border: 'none',
                cursor: 'pointer',
                background: view === v.k ? 'var(--surface-card)' : 'transparent',
                color: view === v.k ? 'var(--ink)' : 'var(--ink-3)',
                fontSize: 12,
                fontWeight: 500,
                borderRadius: 6,
                boxShadow: view === v.k ? 'var(--shadow-1)' : 'none',
              }}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {view === 'board' && <KanbanBoard permits={filtered} onMoveStage={handleMoveStage} />}
      {view === 'table' && <SubmissionsTable permits={filtered} />}
      {view === 'map' && <MapView permits={filtered} />}

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: 'var(--ink-4)' }}>
        <UploadIcon size={12} />
        <span>Upload more PDFs from the toolbar to populate the live queue.</span>
      </div>
    </div>
  )
}
