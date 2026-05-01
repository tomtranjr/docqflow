import type { Permit } from '@/lib/permitData'

interface HistoryPanelProps {
  permit: Permit
}

interface HistoryEntry {
  v: string
  who: string
  at: string
  note: string
}

const HISTORY: HistoryEntry[] = [
  { v: 'v3 · current', who: 'Alex Smith', at: 'Apr 25 · 11:23', note: 'Marked square footage as missing' },
  { v: 'v2', who: 'DocQ AI', at: 'Apr 22 · 09:15', note: 'Re-extracted after model upgrade' },
  { v: 'v1', who: 'Citizen portal', at: 'Apr 22 · 09:14', note: 'Initial submission' },
]

export function HistoryPanel({ permit }: HistoryPanelProps) {
  return (
    <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="label-eyebrow">Document History · {permit.id}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {HISTORY.map((h) => (
          <div
            key={h.v}
            style={{
              padding: 12,
              border: '1px solid var(--line)',
              borderRadius: 'var(--r)',
              background: 'var(--surface-card)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div className="mono" style={{ fontSize: 11, fontWeight: 600 }}>
                {h.v}
              </div>
              <span style={{ fontSize: 11, color: 'var(--ink-4)' }}>{h.at}</span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--ink-2)', marginTop: 4 }}>{h.who}</div>
            <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 4 }}>{h.note}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
