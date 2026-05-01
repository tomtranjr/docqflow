interface KpiBreakdown {
  k: string
  v: string
}

interface KpiCardProps {
  label: string
  value: string
  delta: string
  trend: number[]
  accent: string
  deltaPositive?: boolean
  sub?: string
  breakdown?: KpiBreakdown[]
}

// KPI tile for the Dashboard hero row. Sparkline area-chart on top, optional
// breakdown row at the bottom.
export function KpiCard({ label, value, delta, trend, accent, deltaPositive, sub, breakdown }: KpiCardProps) {
  const max = Math.max(...trend)
  const min = Math.min(...trend)
  const norm = (v: number) => (v - min) / (max - min || 1)

  const points = trend.map((v, i) => `${(i / (trend.length - 1)) * 100},${22 - norm(v) * 18 - 2}`).join(' ')
  const deltaTone = deltaPositive
    ? { color: 'var(--ok)', bg: 'var(--ok-bg)' }
    : delta.startsWith('+')
      ? { color: 'var(--blue-500)', bg: 'var(--blue-100)' }
      : { color: 'var(--warn)', bg: 'var(--warn-bg)' }

  return (
    <div className="card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div className="label-eyebrow">{label}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div className="tabular" style={{ fontSize: 30, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1 }}>
          {value}
        </div>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 11,
            fontWeight: 600,
            lineHeight: 1,
            color: deltaTone.color,
            background: deltaTone.bg,
            padding: '3px 7px',
            borderRadius: 4,
            height: 20,
          }}
        >
          {delta}
        </span>
      </div>
      {sub && <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: -4 }}>{sub}</div>}
      <svg viewBox="0 0 100 22" preserveAspectRatio="none" className="spark" style={{ width: '100%', height: 28 }}>
        <polyline fill="none" stroke={accent} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" points={points} />
        <polyline fill={accent} opacity="0.12" points={`0,22 ${points} 100,22`} />
      </svg>
      {breakdown && (
        <div style={{ display: 'flex', gap: 0, paddingTop: 10, borderTop: '1px solid var(--line)' }}>
          {breakdown.map((b, i) => (
            <div
              key={b.k}
              style={{
                flex: 1,
                paddingLeft: i === 0 ? 0 : 10,
                borderLeft: i === 0 ? 'none' : '1px solid var(--line)',
                minWidth: 0,
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  color: 'var(--ink-4)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {b.k}
              </div>
              <div className="tabular" style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginTop: 2 }}>
                {b.v}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
