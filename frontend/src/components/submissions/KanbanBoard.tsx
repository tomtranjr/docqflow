import { useState, type DragEvent } from 'react'
import { ChevronDownIcon } from '@/components/brand/icons'
import { STAGES, type Permit, type StageKey } from '@/lib/permitData'
import { KanbanCard } from './KanbanCard'

interface KanbanBoardProps {
  permits: Permit[]
  onMoveStage: (permitId: string, newStage: StageKey) => void
}

export function KanbanBoard({ permits, onMoveStage }: KanbanBoardProps) {
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [hoverStage, setHoverStage] = useState<StageKey | null>(null)

  function handleDrop(e: DragEvent<HTMLDivElement>, stage: StageKey) {
    e.preventDefault()
    const permitId = e.dataTransfer.getData('text/plain')
    if (permitId) {
      const current = permits.find((p) => p.id === permitId)
      if (current && current.stage !== stage) {
        onMoveStage(permitId, stage)
      }
    }
    setDraggingId(null)
    setHoverStage(null)
  }

  function handleDragOver(e: DragEvent<HTMLDivElement>, stage: StageKey) {
    if (!draggingId) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (hoverStage !== stage) setHoverStage(stage)
  }

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
        const isHover = hoverStage === s.key
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
              onDragOver={(e) => handleDragOver(e, s.key)}
              onDragLeave={() => {
                if (hoverStage === s.key) setHoverStage(null)
              }}
              onDrop={(e) => handleDrop(e, s.key)}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                padding: '8px',
                background: isHover ? 'var(--surface-hover)' : 'var(--surface-sunken)',
                borderRadius: 'var(--r-md)',
                minHeight: 200,
                outline: isHover ? '2px dashed var(--blue-500)' : 'none',
                outlineOffset: -2,
                transition: 'background .12s var(--ease), outline-color .12s var(--ease)',
              }}
            >
              {items.map((p) => (
                <KanbanCard
                  key={p.id}
                  p={p}
                  isDragging={draggingId === p.id}
                  onDragStart={(id) => setDraggingId(id)}
                  onDragEnd={() => {
                    setDraggingId(null)
                    setHoverStage(null)
                  }}
                />
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
                  {isHover ? 'Drop to move here' : 'Empty'}
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
