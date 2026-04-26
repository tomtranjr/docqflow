import type { ReactNode } from 'react'

interface RailBtnProps {
  label: string
  active?: boolean
  onClick?: () => void
  children: ReactNode
}

export function RailBtn({ label, active, onClick, children }: RailBtnProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      style={{
        width: 40,
        height: 40,
        borderRadius: 8,
        background: active ? 'var(--blue-100)' : 'transparent',
        color: active ? 'var(--blue-600)' : 'var(--ink-3)',
        border: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        transition: 'background .12s var(--ease)',
      }}
      onMouseEnter={(e) => {
        if (!active) e.currentTarget.style.background = 'var(--surface-hover)'
      }}
      onMouseLeave={(e) => {
        if (!active) e.currentTarget.style.background = 'transparent'
      }}
    >
      {children}
    </button>
  )
}
