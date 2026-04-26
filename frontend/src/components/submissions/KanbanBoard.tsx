import { ChevronDownIcon } from '@/components/brand/icons'
import { STAGES, type Permit } from '@/lib/permitData'
import { KanbanCard } from './KanbanCard'

interface KanbanBoardProps {
  permits: Permit[]
}

export function KanbanBoard({ permits }: KanbanBoardProps) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
        gap: 14,
        minHeight: 560,
      }}
    >
      {STAGES.map((s, i) => {
        const items = permits.filter((p) => p.stage === s.key)
        return (
          <div key={s.key} style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 4px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: i < 4 ? 'var(--blue-500)' : 'var(--ok)',
                  }}
                />
                <span style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {s.label}
                </span>
                <span className="mono tabular" style={{ fontSize: 11, color: 'var(--ink-4)' }}>
                  {items.length}
                </span>
              </div>
              <button type="button" className="btn btn-ghost btn-sm" style={{ padding: 4, height: 22 }}>
                <ChevronDownIcon size={12} />
              </button>
            </div>
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                padding: '8px',
                background: 'var(--surface-sunken)',
                borderRadius: 'var(--r-md)',
                minHeight: 200,
              }}
            >
              {items.map((p) => (
                <KanbanCard key={p.id} p={p} />
              ))}
              {items.length === 0 && (
                <div
                  className="dashed-drop"
                  style={{
                    height: 80,
                    borderRadius: 'var(--r)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 11,
                    color: 'var(--ink-4)',
                  }}
                >
                  Empty
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
