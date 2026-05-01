import { useEffect, useState } from 'react'
import { DownloadIcon, SparkleIcon } from '@/components/brand/icons'
import { CONF_BUCKETS, THROUGHPUT } from '@/lib/permitData'
import { getStats } from '@/lib/api'
import type { StatsResponse } from '@/lib/types'

interface BigKpiProps {
  label: string
  value: string | number
  sub: string
  delta: string
  deltaPos?: boolean
}

function BigKpi({ label, value, sub, delta, deltaPos }: BigKpiProps) {
  return (
    <div className="card" style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div className="label-eyebrow">{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
        <span
          className="tabular"
          style={{ fontSize: 36, fontWeight: 700, letterSpacing: '-0.025em', fontFamily: 'var(--font-display)' }}
        >
          {value}
        </span>
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: deltaPos ? 'var(--ok)' : 'var(--warn)',
            background: deltaPos ? 'var(--ok-bg)' : 'var(--warn-bg)',
            padding: '2px 6px',
            borderRadius: 4,
          }}
        >
          {delta}
        </span>
      </div>
      <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>{sub}</div>
    </div>
  )
}

interface DonutSlice {
  d: string
  v: number
  c: string
}

const DONUT_DATA: DonutSlice[] = [
  { d: 'Building', v: 45, c: 'var(--blue-500)' },
  { d: 'Electrical', v: 22, c: '#D97706' },
  { d: 'Plumbing', v: 18, c: '#0EA5E9' },
  { d: 'Zoning', v: 12, c: '#7C3AED' },
  { d: 'Other', v: 3, c: 'var(--ink-4)' },
]

function DonutChart({ totalLabel }: { totalLabel: string }) {
  const r = 60
  const c = 80
  const sw = 22
  const circumference = 2 * Math.PI * r
  // Pre-compute each slice's offset purely from its index — no mid-render mutation.
  const slices = DONUT_DATA.reduce<Array<{ slice: typeof DONUT_DATA[number]; len: number; off: number }>>(
    (acc, slice) => {
      const totalSoFar = acc.reduce((sum, x) => sum + x.slice.v, 0)
      const len = (slice.v / 100) * circumference
      const off = -((totalSoFar / 100) * circumference)
      return [...acc, { slice, len, off }]
    },
    [],
  )
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: 18, alignItems: 'center' }}>
      <svg viewBox="0 0 160 160" style={{ width: 180, height: 180 }} role="img" aria-label="Routing breakdown">
        <circle cx={c} cy={c} r={r} fill="none" stroke="var(--surface-sunken)" strokeWidth={sw} />
        {slices.map(({ slice, len, off }) => (
          <circle
            key={slice.d}
            cx={c}
            cy={c}
            r={r}
            fill="none"
            stroke={slice.c}
            strokeWidth={sw}
            strokeDasharray={`${len} ${circumference - len}`}
            strokeDashoffset={off}
            transform={`rotate(-90 ${c} ${c})`}
          />
        ))}
        <text x={c} y={c - 4} textAnchor="middle" fontSize="22" fontWeight="700" fill="var(--ink)">
          {totalLabel}
        </text>
        <text x={c} y={c + 14} textAnchor="middle" fontSize="9" fill="var(--ink-3)" letterSpacing="0.06em">
          PERMITS
        </text>
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {DONUT_DATA.map((slice) => (
          <div key={slice.d} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12 }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: slice.c }} />
            <span style={{ flex: 1, color: 'var(--ink-2)' }}>{slice.d}</span>
            <span className="mono tabular" style={{ color: 'var(--ink-3)', fontSize: 11 }}>
              {slice.v}%
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

interface LeaderboardRow {
  n: string
  c: number
  t: string
  r: number
  trend: number[]
}

const LEADERBOARD: LeaderboardRow[] = [
  { n: 'Alex Smith', c: 47, t: '12m', r: 92, trend: [3, 5, 4, 6, 7, 5, 8, 6, 7, 9] },
  { n: 'Priya Sharma', c: 41, t: '14m', r: 88, trend: [2, 3, 4, 3, 5, 4, 6, 7, 5, 6] },
  { n: 'Marcus Lee', c: 36, t: '11m', r: 95, trend: [4, 5, 3, 4, 5, 6, 5, 4, 6, 7] },
  { n: 'Jordan Diaz', c: 29, t: '18m', r: 81, trend: [1, 2, 3, 2, 3, 4, 3, 4, 5, 3] },
]

export function Reports() {
  const [stats, setStats] = useState<StatsResponse | null>(null)

  useEffect(() => {
    let cancelled = false
    getStats()
      .then((data) => {
        if (!cancelled) setStats(data)
      })
      .catch(() => {
        // Stats endpoint may be down — fall through to mock-only display
      })
    return () => {
      cancelled = true
    }
  }, [])

  const max = Math.max(...THROUGHPUT.map((d) => Math.max(d.in, d.out)))
  const totalIn = stats?.total ?? THROUGHPUT.reduce((a, b) => a + b.in, 0)
  const totalOut = THROUGHPUT.reduce((a, b) => a + b.out, 0)
  const totalConf = CONF_BUCKETS.reduce((a, b) => a + b.count, 0)
  const recent7d = stats?.recent_count_7d ?? 53

  return (
    <div style={{ padding: 'var(--pad-page)', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div className="label-eyebrow" style={{ marginBottom: 4 }}>Operations</div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, letterSpacing: '-0.01em' }}>Reports</h1>
          <p style={{ fontSize: 13, color: 'var(--ink-3)', margin: '4px 0 0' }}>
            Permit throughput and processing metrics
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ display: 'flex', gap: 4, padding: 3, background: 'var(--surface-sunken)', borderRadius: 'var(--r)' }}>
            {(['7d', '14d', '30d', 'QTD'] as const).map((t, i) => (
              <button
                key={t}
                type="button"
                style={{
                  height: 28,
                  padding: '0 12px',
                  border: 'none',
                  cursor: 'pointer',
                  background: i === 1 ? 'var(--surface-card)' : 'transparent',
                  color: i === 1 ? 'var(--ink)' : 'var(--ink-3)',
                  fontSize: 12,
                  fontWeight: 500,
                  borderRadius: 6,
                  boxShadow: i === 1 ? 'var(--shadow-1)' : 'none',
                }}
              >
                {t}
              </button>
            ))}
          </div>
          <button type="button" className="btn">
            <DownloadIcon size={14} /> Export PDF
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        <BigKpi label="Permits processed" value={totalOut} sub={`${totalIn} received total`} delta="+18%" deltaPos />
        <BigKpi label="Avg. days to approval" value="2.4" sub="Target: under 3 days" delta="−18%" deltaPos />
        <BigKpi label="Auto-classification rate" value="87%" sub="14% needed human re-routing" delta="+4pp" deltaPos />
        <BigKpi label="Reviewer hours saved" value={recent7d * 2 + 36} sub="vs all-manual baseline (week)" delta="+22h" deltaPos />
      </div>

      <div className="card" style={{ padding: '20px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <div>
            <h2 style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>Daily throughput</h2>
            <p style={{ fontSize: 12, color: 'var(--ink-3)', margin: '2px 0 0' }}>
              {totalIn} received · {totalOut} processed in last 14 days
            </p>
          </div>
          <div style={{ display: 'flex', gap: 14, fontSize: 11 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--blue-200)' }} /> Received
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--blue-500)' }} /> Processed
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 220, paddingLeft: 30, position: 'relative' }}>
          {[0, 10, 20, 30].map((v) => (
            <div
              key={v}
              style={{
                position: 'absolute',
                left: 0,
                bottom: `${(v / max) * 100}%`,
                fontSize: 10,
                color: 'var(--ink-4)',
                fontFamily: 'var(--font-mono)',
              }}
            >
              {v}
            </div>
          ))}
          {[10, 20, 30].map((v) => (
            <div
              key={v}
              style={{
                position: 'absolute',
                left: 26,
                right: 0,
                bottom: `${(v / max) * 100}%`,
                borderTop: '1px dashed var(--line)',
              }}
            />
          ))}
          {THROUGHPUT.map((d) => (
            <div
              key={d.d}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4,
                height: '100%',
                justifyContent: 'flex-end',
                position: 'relative',
                zIndex: 1,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  gap: 2,
                  alignItems: 'flex-end',
                  height: '100%',
                  width: '100%',
                  justifyContent: 'center',
                }}
              >
                <div
                  style={{ width: '40%', height: `${(d.in / max) * 100}%`, background: 'var(--blue-200)', borderRadius: '3px 3px 0 0' }}
                  title={`${d.in} received`}
                />
                <div
                  style={{ width: '40%', height: `${(d.out / max) * 100}%`, background: 'var(--blue-500)', borderRadius: '3px 3px 0 0' }}
                  title={`${d.out} processed`}
                />
              </div>
              <span style={{ fontSize: 9, color: 'var(--ink-4)', fontFamily: 'var(--font-mono)' }}>{d.d.split(' ')[1]}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 14 }}>
        <div className="card" style={{ padding: '20px 24px' }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>Classification confidence — distribution</h2>
          <p style={{ fontSize: 12, color: 'var(--ink-3)', margin: '2px 0 18px' }}>
            {totalConf} permits · histogram by confidence bucket
          </p>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 200 }}>
            {CONF_BUCKETS.map((b) => {
              const max = Math.max(...CONF_BUCKETS.map((c) => c.count))
              return (
                <div
                  key={b.range}
                  style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    height: '100%',
                    justifyContent: 'flex-end',
                  }}
                >
                  <span className="mono tabular" style={{ fontSize: 11, fontWeight: 600, color: b.color, marginBottom: 4 }}>
                    {b.count}
                  </span>
                  <div
                    style={{
                      width: '100%',
                      height: `${(b.count / max) * 90}%`,
                      background: b.color,
                      borderRadius: '4px 4px 0 0',
                      opacity: 0.85,
                    }}
                  />
                  <span style={{ fontSize: 10, color: 'var(--ink-4)', marginTop: 6, fontFamily: 'var(--font-mono)' }}>
                    {b.range}
                  </span>
                </div>
              )
            })}
          </div>
          <div
            style={{
              marginTop: 18,
              padding: '12px 14px',
              background: 'var(--blue-50)',
              borderRadius: 'var(--r)',
              fontSize: 12,
              color: 'var(--ink-2)',
              display: 'flex',
              gap: 10,
              alignItems: 'flex-start',
            }}
          >
            <span style={{ color: 'var(--blue-500)', marginTop: 2 }}>
              <SparkleIcon size={14} />
            </span>
            <span>
              <b>Insight:</b> 88% of submissions classify above 80% confidence — meeting the auto-route threshold.
              The 13 permits below 70% likely need OCR or manual review.
            </span>
          </div>
        </div>

        <div className="card" style={{ padding: '20px 24px' }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>Routing breakdown</h2>
          <p style={{ fontSize: 12, color: 'var(--ink-3)', margin: '2px 0 18px' }}>By department, last 14 days</p>
          <DonutChart totalLabel={String(stats?.total ?? 312)} />
        </div>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--line)' }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>Reviewer activity</h2>
          <p style={{ fontSize: 12, color: 'var(--ink-3)', margin: '2px 0 0' }}>Top reviewers in the last 14 days</p>
        </div>
        <table className="tbl">
          <thead>
            <tr>
              <th>Reviewer</th>
              <th>Permits closed</th>
              <th>Avg. time</th>
              <th>Approve rate</th>
              <th style={{ width: 200 }}>Throughput</th>
            </tr>
          </thead>
          <tbody>
            {LEADERBOARD.map((r, i) => (
              <tr key={r.n}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        background: 'var(--blue-100)',
                        color: 'var(--ink-800)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 11,
                        fontWeight: 700,
                      }}
                    >
                      {r.n.split(' ').map((s) => s[0]).join('')}
                    </div>
                    <span style={{ fontWeight: 500, color: 'var(--ink)' }}>{r.n}</span>
                    {i === 0 && (
                      <span className="pill pill-success" style={{ height: 18, fontSize: 10 }}>
                        You
                      </span>
                    )}
                  </div>
                </td>
                <td className="mono tabular">{r.c}</td>
                <td className="mono tabular">{r.t}</td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 60, height: 4, background: 'var(--surface-sunken)', borderRadius: 2 }}>
                      <div style={{ width: `${r.r}%`, height: '100%', background: 'var(--ok)', borderRadius: 2 }} />
                    </div>
                    <span className="mono tabular" style={{ fontSize: 11 }}>
                      {r.r}%
                    </span>
                  </div>
                </td>
                <td>
                  <svg viewBox="0 0 100 24" preserveAspectRatio="none" style={{ width: 160, height: 22 }}>
                    <polyline
                      fill="none"
                      stroke="var(--blue-500)"
                      strokeWidth="1.5"
                      points={r.trend
                        .map((v, j) => `${(j / (r.trend.length - 1)) * 100},${24 - (v / 9) * 20 - 2}`)
                        .join(' ')}
                    />
                  </svg>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
