import { Link } from 'react-router-dom'
import { Wordmark } from '@/components/brand/Wordmark'
import { SFSeal } from '@/components/brand/SFSeal'
import { BuildingIcon, BoltIcon, DropIcon, MapIcon, SparkleIcon, ShieldIcon } from '@/components/brand/icons'

const FEATURES = [
  {
    Icon: SparkleIcon,
    title: 'Auto extraction',
    body: 'Vision OCR + LLM parser pull permit fields out of every PDF in under two seconds.',
  },
  {
    Icon: ShieldIcon,
    title: 'Completeness check',
    body: 'Missing fields flagged before a reviewer ever opens the file.',
  },
  {
    Icon: MapIcon,
    title: 'Smart routing',
    body: 'Permits land on the right desk: Building, Electrical, Plumbing, Zoning.',
  },
  {
    Icon: BuildingIcon,
    title: 'Reviewer cockpit',
    body: 'PDF and structured fields side-by-side with hover-to-highlight evidence.',
  },
] as const

const DEPTS = [
  { Icon: BuildingIcon, label: 'Building' },
  { Icon: BoltIcon, label: 'Electrical' },
  { Icon: DropIcon, label: 'Plumbing' },
  { Icon: MapIcon, label: 'Zoning' },
] as const

export function Landing() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '18px 32px',
          borderBottom: '1px solid var(--line)',
          background: 'var(--surface-card)',
        }}
      >
        <Wordmark size={20} />
        <Link to="/login" className="btn btn-primary btn-sm">
          Sign in
        </Link>
      </header>

      <main style={{ flex: 1, padding: '64px 32px', maxWidth: 1100, margin: '0 auto', width: '100%' }}>
        <section style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 14 }}>
          <span className="label-eyebrow" style={{ color: 'var(--blue-500)' }}>
            City &amp; County of San Francisco
          </span>
          <h1
            style={{
              fontSize: 44,
              fontWeight: 800,
              letterSpacing: '-0.02em',
              margin: 0,
              maxWidth: 780,
              lineHeight: 1.1,
            }}
          >
            Intelligent document processing for smarter permitting.
          </h1>
          <p style={{ fontSize: 16, color: 'var(--ink-3)', maxWidth: 620, margin: '8px 0 0', lineHeight: 1.55 }}>
            DocQFlow helps the Department of Building Inspection move every permit faster — extract, validate, route,
            and review without losing the human in the loop.
          </p>
          <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
            <Link to="/login" className="btn btn-accent btn-lg">
              Sign in to start
            </Link>
            <Link to="/login" className="btn btn-lg">
              See how it works
            </Link>
          </div>
        </section>

        <section
          style={{
            marginTop: 56,
            display: 'grid',
            gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
            gap: 14,
          }}
        >
          {FEATURES.map(({ Icon, title, body }) => (
            <article key={title} className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <span
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  background: 'var(--blue-50)',
                  color: 'var(--blue-500)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon size={18} />
              </span>
              <h2 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>{title}</h2>
              <p style={{ fontSize: 12, color: 'var(--ink-3)', margin: 0, lineHeight: 1.55 }}>{body}</p>
            </article>
          ))}
        </section>

        <section
          style={{
            marginTop: 56,
            padding: '24px 28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 24,
            borderRadius: 'var(--r-lg)',
            background: 'linear-gradient(135deg, var(--ink-800), var(--ink-700))',
            color: '#fff',
            flexWrap: 'wrap',
          }}
        >
          <div>
            <div className="label-eyebrow" style={{ color: 'rgba(255,255,255,0.55)' }}>
              Trusted across DBI
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, marginTop: 6 }}>
              Routing 312 permits a week across 4 departments.
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            {DEPTS.map(({ Icon, label }) => (
              <span
                key={label}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 10px',
                  borderRadius: 999,
                  background: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                <Icon size={14} />
                {label}
              </span>
            ))}
          </div>
        </section>
      </main>

      <footer
        style={{
          padding: '16px 32px',
          borderTop: '1px solid var(--line)',
          background: 'var(--surface-card)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: 12,
          color: 'var(--ink-4)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <SFSeal size={20} />
          <span>City &amp; County of San Francisco · Department of Building Inspection</span>
        </div>
        <div>v2.4.0</div>
      </footer>
    </div>
  )
}
