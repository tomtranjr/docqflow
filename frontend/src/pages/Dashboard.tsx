import { useNavigate } from 'react-router-dom'
import { useFirstName } from '@/context/PreferencesContext'
import { useReviewQueue } from '@/hooks/useReviewQueue'
import { ArrowIcon } from '@/components/brand/icons'
import { SFSeal } from '@/components/brand/SFSeal'
import { KpiCard } from '@/components/dashboard/KpiCard'
import { PipelineStack } from '@/components/dashboard/PipelineStack'
import { Activity } from '@/components/dashboard/Activity'
import { DeptCard } from '@/components/dashboard/DeptCard'
import { ReviewQueueRow } from '@/components/queue/ReviewQueueRow'
import { DEPARTMENTS, PERMITS } from '@/lib/permitData'

function formatDayString(): string {
  const now = new Date()
  return now.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
}

export function Dashboard() {
  const navigate = useNavigate()
  const firstName = useFirstName()
  const { rows: allRows, loading, isLive } = useReviewQueue()

  const myQueue = allRows.slice(0, 5)
  const queueAll = PERMITS.filter((p) => p.stage === 'review')
  const queueAtRisk = queueAll.filter((p) => p.daysOpen >= 3).length
  const queueOldest = queueAll.reduce((a, p) => (p.daysOpen > a ? p.daysOpen : a), 0)
  const queueAvgConf =
    queueAll.length > 0
      ? Math.round((queueAll.reduce((a, p) => a + p.confidence, 0) / queueAll.length) * 100)
      : 0

  const greeting = firstName.trim() || 'Alex'
  const resumePermit = myQueue[0]?.id ?? PERMITS[0].id
  const resumeHref = myQueue[0]?.reviewHref ?? `/app/review/${PERMITS[0].id}`

  return (
    <div style={{ padding: 'var(--pad-page)', display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Hero + KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1fr', gap: 16 }}>
        <div
          className="card"
          style={{
            padding: '22px 24px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            background: 'linear-gradient(135deg, var(--ink-800), var(--ink-700))',
            color: '#fff',
            border: 'none',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div style={{ position: 'absolute', right: -40, top: -40, opacity: 0.08 }}>
            <SFSeal size={220} color="#fff" />
          </div>
          <div style={{ position: 'relative' }}>
            <div className="label-eyebrow" style={{ color: 'rgba(255,255,255,0.55)' }}>{formatDayString()}</div>
            <h1 style={{ fontSize: 26, fontWeight: 700, margin: '8px 0 4px', letterSpacing: '-0.01em' }}>
              Good morning, {greeting}.
            </h1>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.72)', margin: 0 }}>
              <span style={{ color: '#FFB266', fontWeight: 600 }}>{queueAll.length} permits</span> waiting in your queue
              {queueAtRisk > 0 ? ` · ${queueAtRisk} flagged for attention` : ''}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 18, position: 'relative' }}>
            <button type="button" className="btn btn-accent" onClick={() => navigate(resumeHref)}>
              Resume {resumePermit} <ArrowIcon size={14} />
            </button>
            <button
              type="button"
              className="btn"
              style={{
                background: 'rgba(255,255,255,0.1)',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.2)',
              }}
              onClick={() => navigate('/app/submissions')}
            >
              View all submissions
            </button>
          </div>
        </div>

        <KpiCard
          label="Pending review"
          value={String(queueAll.length || 12)}
          delta="+3"
          trend={[8, 10, 9, 11, 10, 12, 12]}
          accent="var(--blue-500)"
          sub="vs 9 same time last week"
          breakdown={[
            { k: 'High conf.', v: '5' },
            { k: 'Flagged', v: String(queueAtRisk) },
            { k: 'Stale >3d', v: '3' },
          ]}
        />
        <KpiCard
          label="Avg. processing"
          value="2.4d"
          delta="−18%"
          trend={[3.2, 3.0, 2.9, 2.8, 2.5, 2.4, 2.4]}
          accent="var(--ok)"
          deltaPositive
          sub="Target ≤ 2.0d · trending down"
          breakdown={[
            { k: 'Intake', v: '0.3d' },
            { k: 'Extract', v: '0.1d' },
            { k: 'Review', v: '2.0d' },
          ]}
        />
        <KpiCard
          label="Auto-classified"
          value="87%"
          delta="+4pp"
          trend={[78, 80, 82, 84, 85, 86, 87]}
          accent="var(--ok)"
          deltaPositive
          sub="Goal: 90% by Q3 · 411 of 472 permits"
          breakdown={[
            { k: 'Building', v: '62%' },
            { k: 'Electrical', v: '18%' },
            { k: 'Other', v: '20%' },
          ]}
        />
      </div>

      {/* Two-up: queue + activity */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.55fr 1fr', gap: 16 }}>
        <div className="card" style={{ padding: 0, display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              padding: '16px 20px',
              borderBottom: '1px solid var(--line)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <h2 style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>Your review queue</h2>
              <p style={{ fontSize: 12, color: 'var(--ink-3)', margin: '2px 0 0' }}>
                {loading ? 'Loading…' : `Permits ready for human verification${isLive ? '' : ' (demo data)'}`}
              </p>
            </div>
            <button type="button" className="btn btn-sm btn-ghost" onClick={() => navigate('/app/submissions')}>
              View all →
            </button>
          </div>
          <div style={{ flex: 1 }}>
            {myQueue.map((row, i) => (
              <ReviewQueueRow key={row.id} row={row} isLast={i === myQueue.length - 1} />
            ))}
          </div>
          <div
            style={{
              padding: '12px 20px',
              borderTop: '1px solid var(--line)',
              background: 'var(--surface-sunken)',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr 1fr',
              gap: 16,
              alignItems: 'center',
            }}
          >
            <div>
              <div className="label-eyebrow" style={{ fontSize: 10 }}>In your queue</div>
              <div className="tabular" style={{ fontSize: 16, fontWeight: 700, marginTop: 2 }}>{queueAll.length}</div>
            </div>
            <div>
              <div className="label-eyebrow" style={{ fontSize: 10 }}>SLA at risk</div>
              <div
                className="tabular"
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  marginTop: 2,
                  color: queueAtRisk > 0 ? 'var(--warn)' : 'var(--ink)',
                }}
              >
                {queueAtRisk}
                <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--ink-3)', marginLeft: 4 }}>≥3d</span>
              </div>
            </div>
            <div>
              <div className="label-eyebrow" style={{ fontSize: 10 }}>Oldest</div>
              <div className="tabular" style={{ fontSize: 16, fontWeight: 700, marginTop: 2 }}>
                {queueOldest}
                <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--ink-3)' }}>d</span>
              </div>
            </div>
            <div>
              <div className="label-eyebrow" style={{ fontSize: 10 }}>Avg. confidence</div>
              <div className="tabular" style={{ fontSize: 16, fontWeight: 700, marginTop: 2, color: 'var(--ok)' }}>
                {queueAvgConf}%
              </div>
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: 0 }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)' }}>
            <h2 style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>Pipeline at a glance</h2>
            <p style={{ fontSize: 12, color: 'var(--ink-3)', margin: '2px 0 0' }}>
              {PERMITS.length} permits moving through DocQFlow
            </p>
          </div>
          <div style={{ padding: '18px 20px' }}>
            <PipelineStack />
          </div>
          <div style={{ padding: '16px 20px', borderTop: '1px solid var(--line)' }}>
            <div className="label-eyebrow" style={{ marginBottom: 10 }}>Recent activity</div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Activity icon="check" tone="ok" text={<span><b>ELE-26-02041</b> auto-classified to Electrical</span>} time="3m ago" />
              <Activity icon="warn" tone="warn" text={<span><b>BLD-26-04880</b> flagged: low confidence (31%)</span>} time="14m ago" />
              <Activity icon="upload" tone="info" text={<span>2 new permits uploaded via citizen portal</span>} time="22m ago" />
              <Activity icon="check" tone="ok" text={<span><b>BLD-26-04701</b> approved by {greeting}</span>} time="1h ago" />
            </ul>
          </div>
        </div>
      </div>

      {/* Department load */}
      <div className="card" style={{ padding: '20px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <h2 style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>Department load — last 7 days</h2>
            <p style={{ fontSize: 12, color: 'var(--ink-3)', margin: '2px 0 0' }}>Routing distribution and review backlog</p>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button type="button" className="btn btn-sm">7d</button>
            <button type="button" className="btn btn-sm btn-ghost">30d</button>
            <button type="button" className="btn btn-sm btn-ghost">QTD</button>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          {DEPARTMENTS.map((d) => (
            <DeptCard key={d.key} d={d} />
          ))}
        </div>
      </div>
    </div>
  )
}
