import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowIcon, DocIcon, SearchIcon } from '@/components/brand/icons'
import { PERMITS } from '@/lib/permitData'

interface CommandPaletteProps {
  onClose: () => void
}

interface Item {
  kind: 'permit' | 'page'
  label: string
  sub?: string
  go: () => void
}

export function CommandPalette({ onClose }: CommandPaletteProps) {
  const [q, setQ] = useState('')
  const inputRef = useRef<HTMLInputElement | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    inputRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const all: Item[] = [
    ...PERMITS.slice(0, 8).map((p) => ({
      kind: 'permit' as const,
      label: `${p.id} — ${p.applicant}`,
      sub: p.address,
      go: () => navigate(`/app/review/${p.id}`),
    })),
    { kind: 'page', label: 'Go to Dashboard', go: () => navigate('/app') },
    { kind: 'page', label: 'Go to Submissions', go: () => navigate('/app/submissions') },
    { kind: 'page', label: 'Go to Reports', go: () => navigate('/app/reports') },
    { kind: 'page', label: 'Go to Settings', go: () => navigate('/app/settings') },
  ]
  const items = q ? all.filter((x) => x.label.toLowerCase().includes(q.toLowerCase())) : all

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(5,14,36,0.55)',
          zIndex: 100,
          backdropFilter: 'blur(2px)',
        }}
      />
      <div
        className="card"
        style={{
          position: 'fixed',
          top: '20%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 560,
          zIndex: 101,
          boxShadow: 'var(--shadow-pop)',
        }}
      >
        <div
          style={{
            padding: '14px 16px',
            borderBottom: '1px solid var(--line)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <SearchIcon size={16} />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search permits, addresses, or jump to…"
            style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 14 }}
          />
          <kbd
            style={{
              fontSize: 11,
              fontFamily: 'var(--font-mono)',
              background: 'var(--surface-sunken)',
              padding: '2px 6px',
              borderRadius: 4,
              color: 'var(--ink-3)',
            }}
          >
            esc
          </kbd>
        </div>
        <div style={{ maxHeight: 360, overflow: 'auto', padding: 6 }}>
          {items.map((it, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                it.go()
                onClose()
              }}
              style={{
                display: 'flex',
                width: '100%',
                textAlign: 'left',
                alignItems: 'center',
                gap: 10,
                padding: '10px 12px',
                border: 'none',
                background: 'transparent',
                borderRadius: 6,
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--blue-50)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <span style={{ color: 'var(--ink-3)' }}>
                {it.kind === 'permit' ? <DocIcon size={14} /> : <ArrowIcon size={14} />}
              </span>
              <span style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{it.label}</div>
                {it.sub && <div style={{ fontSize: 11, color: 'var(--ink-4)' }}>{it.sub}</div>}
              </span>
              {it.kind === 'permit' && <span className="pill" style={{ fontSize: 10 }}>permit</span>}
            </button>
          ))}
        </div>
        <div
          style={{
            padding: '8px 14px',
            borderTop: '1px solid var(--line)',
            fontSize: 11,
            color: 'var(--ink-4)',
            display: 'flex',
            gap: 14,
          }}
        >
          <span>↵ open</span>
          <span>↑↓ navigate</span>
          <span>esc close</span>
        </div>
      </div>
    </>
  )
}
