import { Icons } from '@/components/brand/icons'
import type { DepartmentMeta } from '@/lib/permitData'

interface DeptCardProps {
  d: DepartmentMeta
}

export function DeptCard({ d }: DeptCardProps) {
  const days = [4, 7, 5, 9, 6, 8, 5]
  const max = 10
  const Icon = Icons[d.icon]
  return (
    <div
      style={{
        padding: '16px 18px',
        border: '1px solid var(--line)',
        borderRadius: 'var(--r)',
        background: 'var(--surface-card)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: 'var(--surface-sunken)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: d.accent,
          }}
        >
          <Icon size={14} />
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>{d.key}</div>
          <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>
            <span className="tabular mono">{d.count}</span> in queue
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 36 }}>
        {days.map((v, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: `${(v / max) * 100}%`,
              background: d.accent,
              opacity: 0.25 + (i / days.length) * 0.6,
              borderRadius: 2,
            }}
          />
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 10, color: 'var(--ink-4)' }}>
        <span>Mon</span>
        <span>Sun</span>
      </div>
    </div>
  )
}
