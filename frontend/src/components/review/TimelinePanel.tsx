import { useState } from 'react'
import type { Permit, TimelineEvent } from '@/lib/permitData'
import { PERMITS } from '@/lib/permitData'

interface TimelinePanelProps {
  permit: Permit
}

const FALLBACK_TIMELINE: TimelineEvent[] = PERMITS[0].timeline ?? []

function dotColor(state: TimelineEvent['state']): string {
  if (state === 'done') return 'var(--ok)'
  if (state === 'active') return 'var(--blue-500)'
  return 'var(--line-2)'
}

export function TimelinePanel({ permit }: TimelinePanelProps) {
  const tl: TimelineEvent[] = permit.timeline ?? FALLBACK_TIMELINE
  const initial = Math.max(
    0,
    tl.findIndex((t) => t.state === 'active'),
  )
  const [scrubIdx, setScrubIdx] = useState(initial)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--line)' }}>
        <div className="label-eyebrow">Permit Timeline</div>
        <div style={{ fontSize: 13, fontWeight: 600, marginTop: 4 }}>
          {permit.id} · {permit.daysOpen} days open
        </div>
      </div>

      <div style={{ padding: '16px 18px', borderBottom: '1px solid var(--line)', background: 'var(--surface-sunken)' }}>
        <div style={{ position: 'relative', height: 36, display: 'flex', alignItems: 'center' }}>
          <div
            style={{
              position: 'absolute',
              left: 8,
              right: 8,
              height: 2,
              background: 'var(--line-2)',
              borderRadius: 2,
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: 8,
              width: `${(scrubIdx / Math.max(1, tl.length - 1)) * 96}%`,
              height: 2,
              background: 'var(--blue-500)',
              borderRadius: 2,
            }}
          />
          {tl.map((t, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setScrubIdx(i)}
              aria-label={t.stage}
              title={t.stage}
              style={{
                position: 'absolute',
                left: `calc(${(i / Math.max(1, tl.length - 1)) * 96}% + 8px)`,
                transform: 'translateX(-50%)',
                width: i === scrubIdx ? 16 : 10,
                height: i === scrubIdx ? 16 : 10,
                borderRadius: '50%',
                background: i <= scrubIdx ? 'var(--blue-500)' : 'var(--surface-card)',
                border: i <= scrubIdx ? '2px solid var(--blue-500)' : '2px solid var(--line-2)',
                cursor: 'pointer',
                padding: 0,
                transition: 'all .15s var(--ease)',
              }}
            />
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 10, color: 'var(--ink-4)' }}>
          <span>{tl[0]?.at}</span>
          <span>{tl[tl.length - 1]?.at !== '—' ? tl[tl.length - 1]?.at : 'Pending'}</span>
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '16px 18px' }}>
        {tl.map((t, i) => {
          const isCurrent = i === scrubIdx
          return (
            <div
              key={i}
              style={{
                display: 'grid',
                gridTemplateColumns: '20px 1fr',
                gap: 12,
                paddingBottom: 16,
                position: 'relative',
                opacity: i > scrubIdx ? 0.4 : 1,
              }}
            >
              {i < tl.length - 1 && (
                <div
                  style={{
                    position: 'absolute',
                    left: 9,
                    top: 18,
                    bottom: 0,
                    width: 2,
                    background: t.state === 'done' ? 'var(--ok)' : 'var(--line-2)',
                  }}
                />
              )}
              <div
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  background: dotColor(t.state),
                  border: isCurrent ? '3px solid var(--blue-100)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {t.state === 'done' && (
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                    <path
                      d="m2 5 2 2 4-4"
                      stroke="#fff"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{t.stage}</div>
                <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>
                  {t.who} · {t.at}
                </div>
                {t.note && (
                  <div
                    style={{
                      fontSize: 11,
                      color: 'var(--ink-2)',
                      marginTop: 4,
                      padding: '6px 8px',
                      background: 'var(--surface-sunken)',
                      borderRadius: 4,
                    }}
                  >
                    {t.note}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
