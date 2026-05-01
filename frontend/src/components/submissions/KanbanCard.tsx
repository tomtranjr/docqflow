import { useNavigate } from 'react-router-dom'
import { Icons, WarnIcon } from '@/components/brand/icons'
import { ConfMini } from '@/components/dashboard/ConfMini'
import type { Permit } from '@/lib/permitData'

const DEPT_COLORS: Record<Permit['department'], string> = {
  Building: 'var(--blue-500)',
  Electrical: '#D97706',
  Plumbing: '#0EA5E9',
  Zoning: '#7C3AED',
  Other: 'var(--ink-4)',
}

const DEPT_ICONS: Record<Permit['department'], keyof typeof Icons> = {
  Building: 'building',
  Electrical: 'bolt',
  Plumbing: 'drop',
  Zoning: 'map',
  Other: 'doc',
}

interface KanbanCardProps {
  p: Permit
  onDragStart?: (id: string) => void
  onDragEnd?: () => void
  isDragging?: boolean
}

export function KanbanCard({ p, onDragStart, onDragEnd, isDragging = false }: KanbanCardProps) {
  const navigate = useNavigate()
  const Icon = Icons[DEPT_ICONS[p.department]]
  return (
    <button
      type="button"
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move'
        e.dataTransfer.setData('text/plain', p.id)
        onDragStart?.(p.id)
      }}
      onDragEnd={() => onDragEnd?.()}
      onClick={() => navigate(`/app/review/${p.id}`)}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        background: 'var(--surface-card)',
        border: '1px solid var(--line)',
        borderRadius: 'var(--r)',
        padding: '12px',
        cursor: isDragging ? 'grabbing' : 'grab',
        textAlign: 'left',
        boxShadow: 'var(--shadow-1)',
        opacity: isDragging ? 0.4 : 1,
        transition: 'transform .12s var(--ease), box-shadow .12s var(--ease), opacity .12s var(--ease)',
      }}
      onMouseEnter={(e) => {
        if (isDragging) return
        e.currentTarget.style.transform = 'translateY(-2px)'
        e.currentTarget.style.boxShadow = 'var(--shadow-2)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'none'
        e.currentTarget.style.boxShadow = 'var(--shadow-1)'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            color: DEPT_COLORS[p.department],
            fontSize: 11,
            fontWeight: 600,
          }}
        >
          <Icon size={14} />
          {p.department}
        </span>
        {p.flags.length > 0 && (
          <span className="pill pill-warn" style={{ height: 18, fontSize: 10, padding: '0 6px' }}>
            <WarnIcon size={11} /> {p.flags.length}
          </span>
        )}
      </div>
      <div style={{ minWidth: 0 }}>
        <div className="mono" style={{ fontSize: 11, color: 'var(--ink-4)' }}>{p.id}</div>
        <div style={{ fontSize: 13, fontWeight: 600, marginTop: 2, color: 'var(--ink)' }}>{p.applicant}</div>
        <div
          style={{
            fontSize: 11,
            color: 'var(--ink-3)',
            marginTop: 2,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {p.address}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
        <ConfMini value={p.confidence} />
        <span style={{ fontSize: 10, color: 'var(--ink-4)' }}>{p.daysOpen === 0 ? 'Today' : `${p.daysOpen}d`}</span>
      </div>
    </button>
  )
}
