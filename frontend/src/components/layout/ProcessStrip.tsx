import { Fragment } from 'react'
import { STAGES, type StageKey } from '@/lib/permitData'

interface ProcessStripProps {
  active?: StageKey
  compact?: boolean
}

// Animated pipeline strip — pulse on the active stage, check on done stages.
export function ProcessStrip({ active = 'ready', compact = false }: ProcessStripProps) {
  const idx = STAGES.findIndex((x) => x.key === active)
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: compact ? 6 : 10,
        padding: compact ? '10px 0' : '14px 18px',
        background: compact ? 'transparent' : 'var(--surface-card)',
        border: compact ? 'none' : '1px solid var(--line)',
        borderRadius: compact ? 0 : 'var(--r-md)',
      }}
    >
      {STAGES.map((s, i) => {
        const state = i < idx ? 'done' : i === idx ? 'active' : 'todo'
        return (
          <Fragment key={s.key}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
              <div style={{ position: 'relative', width: 24, height: 24, flexShrink: 0 }}>
                <div
                  className={state === 'active' ? 'proc-dot-active' : ''}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    background:
                      state === 'done'
                        ? 'var(--ok)'
                        : state === 'active'
                          ? 'var(--blue-500)'
                          : 'var(--surface-sunken)',
                    border: state === 'todo' ? '1px solid var(--line-2)' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                  }}
                >
                  {state === 'done' ? (
                    <svg
                      viewBox="0 0 14 14"
                      width="10"
                      height="10"
                      fill="none"
                      stroke="#fff"
                      strokeWidth="2.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="m3 7 3 3 5-6" />
                    </svg>
                  ) : (
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: state === 'active' ? '#fff' : 'var(--ink-4)',
                        fontFamily: 'var(--font-mono)',
                      }}
                    >
                      {i + 1}
                    </span>
                  )}
                </div>
              </div>
              {!compact ? (
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: state === 'todo' ? 'var(--ink-4)' : 'var(--ink)',
                    }}
                  >
                    {s.label}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--ink-4)', whiteSpace: 'nowrap' }}>{s.sub}</div>
                </div>
              ) : (
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: state === 'active' ? 600 : 500,
                    color: state === 'todo' ? 'var(--ink-4)' : 'var(--ink-2)',
                  }}
                >
                  {s.label}
                </span>
              )}
            </div>
            {i < STAGES.length - 1 && (
              <div
                style={{
                  flex: 1,
                  height: 2,
                  background: i < idx ? 'var(--ok)' : 'var(--line)',
                  borderRadius: 2,
                  minWidth: 16,
                }}
              />
            )}
          </Fragment>
        )
      })}
    </div>
  )
}
