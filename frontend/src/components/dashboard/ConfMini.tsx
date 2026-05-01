interface ConfMiniProps {
  value: number
}

// Compact 50-px confidence bar + percentage. Color tracks the same buckets as
// the larger Reports histogram (high/blue/warn/danger).
export function ConfMini({ value }: ConfMiniProps) {
  const pct = Math.round(value * 100)
  const color =
    pct >= 90 ? 'var(--ok)' : pct >= 75 ? 'var(--blue-500)' : pct >= 60 ? 'var(--warn)' : 'var(--danger)'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 90 }}>
      <div style={{ width: 50, height: 4, borderRadius: 2, background: 'var(--surface-sunken)', overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color }} />
      </div>
      <span className="mono tabular" style={{ fontSize: 11, fontWeight: 600, color, minWidth: 30 }}>
        {pct}%
      </span>
    </div>
  )
}
