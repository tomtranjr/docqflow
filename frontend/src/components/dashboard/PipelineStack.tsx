import { useNavigate } from 'react-router-dom'
import { PERMITS, STAGES } from '@/lib/permitData'

export function PipelineStack() {
  const navigate = useNavigate()
  const counts = STAGES.map((s) => ({
    ...s,
    count: PERMITS.filter((p) => p.stage === s.key).length,
  }))
  const total = counts.reduce((a, b) => a + b.count, 0) || 1
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {counts.map((s, i) => (
        <button
          key={s.key}
          type="button"
          onClick={() => navigate('/app/submissions')}
          style={{
            display: 'grid',
            gridTemplateColumns: '100px 1fr auto',
            gap: 10,
            alignItems: 'center',
            padding: '8px 10px',
            borderRadius: 6,
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            textAlign: 'left',
            width: '100%',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-hover)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: i < 4 ? 'var(--blue-500)' : 'var(--ok)',
              }}
            />
            <span style={{ fontSize: 12, fontWeight: 500 }}>{s.label}</span>
          </div>
          <div style={{ height: 6, background: 'var(--surface-sunken)', borderRadius: 3 }}>
            <div className="bar" style={{ width: `${(s.count / total) * 100}%`, height: '100%' }} />
          </div>
          <span className="mono tabular" style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-2)' }}>
            {s.count}
          </span>
        </button>
      ))}
    </div>
  )
}
