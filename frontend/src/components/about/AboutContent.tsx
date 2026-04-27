import { Fragment, type ReactElement } from 'react'
import { Logo } from '@/components/brand/Logo'
import {
  BellIcon,
  BoltIcon,
  CheckIcon,
  DocIcon,
  FilterIcon,
  HashIcon,
  ShieldIcon,
  SparkleIcon,
} from '@/components/brand/icons'

interface PipelineStage {
  id: string
  label: string
  sub: string
  color: string
  bg: string
  border: string
  Icon: (props: { size?: number }) => ReactElement
  items: string[]
}

const PIPELINE: PipelineStage[] = [
  {
    id: 'track',
    label: 'Experiment tracking',
    sub: 'GCS bucket · MLflow',
    color: '#7E22CE',
    bg: 'rgba(126,34,206,0.08)',
    border: 'rgba(126,34,206,0.35)',
    Icon: SparkleIcon,
    items: ['GCS schemas', 'MLflow runs'],
  },
  {
    id: 'gateway',
    label: 'Gateway',
    sub: 'Auth · logging',
    color: '#DC2626',
    bg: 'rgba(220,38,38,0.08)',
    border: 'rgba(220,38,38,0.35)',
    Icon: ShieldIcon,
    items: ['Citizen portal', 'TLS + IAM logging'],
  },
  {
    id: 'extract',
    label: 'Extraction',
    sub: 'OCR · LLM parser',
    color: '#1E63E8',
    bg: 'rgba(30,99,232,0.10)',
    border: 'rgba(30,99,232,0.40)',
    Icon: SparkleIcon,
    items: ['Vision OCR · PaddleOCR', 'Gemini 1.5 Flash parser', 'Structured JSON'],
  },
  {
    id: 'validate',
    label: 'Validator + Router',
    sub: 'Schema · auto-route',
    color: '#D97706',
    bg: 'rgba(217,119,6,0.10)',
    border: 'rgba(217,119,6,0.40)',
    Icon: FilterIcon,
    items: ['Completeness check', 'Auto-triage', 'Validation report'],
  },
  {
    id: 'review',
    label: 'Reviewer dashboard',
    sub: 'DocQFlow · Postgres',
    color: '#059669',
    bg: 'rgba(5,150,105,0.10)',
    border: 'rgba(5,150,105,0.40)',
    Icon: DocIcon,
    items: ['SQL state store', 'Reviewer cockpit'],
  },
  {
    id: 'notify',
    label: 'Notify',
    sub: 'Approvals · webhooks',
    color: '#7C3AED',
    bg: 'rgba(124,58,237,0.10)',
    border: 'rgba(124,58,237,0.40)',
    Icon: BellIcon,
    items: ['City clerk handoff', 'Permit PDF + receipt', 'Payment systems'],
  },
]

interface CicdStep {
  label: string
  sub: string
  Icon: (props: { size?: number }) => ReactElement
}

const CICD: CicdStep[] = [
  { label: 'GitHub', sub: 'source + PRs', Icon: DocIcon },
  { label: 'GitHub Actions', sub: 'CI tests', Icon: CheckIcon },
  { label: 'Docker image', sub: 'build', Icon: HashIcon },
  { label: 'Artifact Registry', sub: 'store', Icon: FilterIcon },
  { label: 'Cloud Run', sub: 'deploy', Icon: BoltIcon },
]

const STACK = [
  'Python 3.12',
  'FastAPI',
  'Postgres 16',
  'GCS',
  'Cloud Run',
  'Pub/Sub',
  'PaddleOCR',
  'Gemini 1.5 Flash',
  'MLflow',
  'Docker',
  'GitHub Actions',
  'Terraform',
  'OpenTelemetry',
  'React 19',
  'Inter',
]

const MODEL_KPIS = [
  { k: 'Field-level F1', v: '0.94', sub: 'across 12k labeled permits' },
  { k: 'End-to-end accuracy', v: '91%', sub: 'vs. clerk-only baseline 78%' },
  { k: 'Auto-route threshold', v: '≥80%', sub: 'below routes to human review' },
  { k: 'Avg. inference', v: '1.8s', sub: 'per page · GPU pool' },
]

const HUMAN_IN_LOOP = [
  { l: 'Side-by-side PDF + extracted fields', v: 'Always' },
  { l: 'Confidence visibility', v: 'Per-reviewer toggle' },
  { l: 'Field corrections feed back to model', v: 'Weekly retrain' },
  { l: 'Full audit trail per permit', v: 'Append-only' },
  { l: 'Department-specific routing rules', v: 'Editable' },
]

interface AboutContentProps {
  showHeader?: boolean
}

export function AboutContent({ showHeader = true }: AboutContentProps) {
  return (
    <>
      {showHeader && (
        <div style={{ marginBottom: 22 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 4px' }}>About DocQFlow</h2>
          <p style={{ fontSize: 13, color: 'var(--ink-3)', margin: 0 }}>How the system works, end to end.</p>
        </div>
      )}

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 22,
          padding: '26px 28px',
          background: 'linear-gradient(135deg, var(--blue-50) 0%, var(--surface-card) 60%)',
          border: '1px solid var(--line)',
          borderRadius: 'var(--r-lg)',
          marginBottom: 24,
          flexWrap: 'wrap',
        }}
      >
        <Logo size={72} />
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontSize: 28,
              fontWeight: 800,
              letterSpacing: '0.02em',
              lineHeight: 1,
              fontFamily: 'var(--font-display)',
            }}
          >
            <span style={{ color: 'var(--ink)' }}>DOCQ</span>
            <span style={{ color: 'var(--blue-500)' }}>FLOW</span>
          </div>
          <div style={{ marginTop: 10, fontSize: 16, color: 'var(--ink)', fontWeight: 500, lineHeight: 1.4, maxWidth: 480 }}>
            Intelligent Document Processing for Smarter Permitting.
          </div>
          <div style={{ marginTop: 6, fontSize: 12, color: 'var(--ink-3)', maxWidth: 540 }}>
            Built for the City &amp; County of San Francisco — accelerating permit review while keeping a human in the
            loop on every decision.
          </div>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 11, color: 'var(--ink-3)', textAlign: 'right' }}>
          <div>
            <span className="mono">v2.4.0</span> · Released Mar 2026
          </div>
          <div>SOC 2 Type II · CJIS-aligned</div>
          <div>WCAG 2.1 AA</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div style={{ padding: 18, border: '1px solid var(--line)', borderRadius: 'var(--r-lg)', background: 'var(--surface-card)' }}>
          <div className="label-eyebrow">How the model works</div>
          <h3 style={{ fontSize: 15, fontWeight: 700, margin: '8px 0 10px' }}>Two-stage extraction with confidence calibration</h3>
          <p style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.6, margin: '0 0 12px' }}>
            Submitted PDFs run through a vision OCR layer (PaddleOCR fine-tuned on SFDBI form templates) followed by an
            LLM parser (Gemini 1.5 Flash) that emits structured JSON keyed against a 47-field permit schema. Each field
            carries a calibrated probability — used downstream for routing.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 14 }}>
            {MODEL_KPIS.map((s) => (
              <div key={s.k} style={{ padding: '10px 12px', background: 'var(--blue-50)', borderRadius: 8, border: '1px solid var(--blue-100)' }}>
                <div style={{ fontSize: 10, color: 'var(--ink-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {s.k}
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)', marginTop: 4, fontFamily: 'var(--font-mono)' }}>{s.v}</div>
                <div style={{ fontSize: 10, color: 'var(--ink-3)', marginTop: 2 }}>{s.sub}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ padding: 18, border: '1px solid var(--line)', borderRadius: 'var(--r-lg)', background: 'var(--surface-card)' }}>
          <div className="label-eyebrow">Human-in-the-loop</div>
          <h3 style={{ fontSize: 15, fontWeight: 700, margin: '8px 0 10px' }}>Reviewer dashboard keeps clerks in control</h3>
          <p style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.6, margin: '0 0 14px' }}>
            Every extraction is reviewable, editable, and traceable. Clerks see model confidence inline (toggle on
            demand), can flag fields back to applicants, and confirm with one click. Corrections feed back into a
            weekly retraining loop on a private GCS bucket.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {HUMAN_IN_LOOP.map((r) => (
              <div
                key={r.l}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '8px 10px',
                  borderBottom: '1px dashed var(--line)',
                  fontSize: 12,
                  gap: 12,
                }}
              >
                <span style={{ color: 'var(--ink-2)' }}>{r.l}</span>
                <span style={{ color: 'var(--ink)', fontWeight: 600 }}>{r.v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ padding: '20px 22px 22px', border: '1px solid var(--line)', borderRadius: 'var(--r-lg)', background: 'var(--surface-card)' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 16, gap: 12, flexWrap: 'wrap' }}>
          <div>
            <div className="label-eyebrow">System architecture</div>
            <h3 style={{ fontSize: 15, fontWeight: 700, margin: '6px 0 0' }}>How a permit moves through DocQFlow</h3>
          </div>
          <span className="mono" style={{ fontSize: 11, color: 'var(--ink-4)' }}>6 stages · 4 GCP services</span>
        </div>

        <div style={{ position: 'relative', marginBottom: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0, 1fr))', gap: 10, alignItems: 'stretch' }}>
            {PIPELINE.map((p, i) => (
              <Fragment key={p.id}>
                <div
                  style={{
                    position: 'relative',
                    background: p.bg,
                    border: `1.5px solid ${p.border}`,
                    borderRadius: 10,
                    padding: '12px 12px 14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                    minHeight: 140,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: 9,
                      fontWeight: 700,
                      color: p.color,
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                    }}
                  >
                    <span
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: '50%',
                        background: 'var(--surface-card)',
                        border: `1.5px solid ${p.border}`,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontFamily: 'var(--font-mono)',
                        color: p.color,
                        fontSize: 10,
                      }}
                    >
                      {i + 1}
                    </span>
                    Step {i + 1}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', lineHeight: 1.2 }}>{p.label}</div>
                    <div style={{ fontSize: 10, color: 'var(--ink-3)', marginTop: 2 }}>{p.sub}</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 'auto' }}>
                    {p.items.map((it) => (
                      <div
                        key={it}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '5px 7px',
                          background: 'var(--surface-card)',
                          border: `1px solid ${p.border}`,
                          borderRadius: 5,
                          fontSize: 10,
                          color: 'var(--ink-2)',
                          fontWeight: 500,
                        }}
                      >
                        <span style={{ width: 5, height: 5, borderRadius: '50%', background: p.color, flexShrink: 0 }} />
                        {it}
                      </div>
                    ))}
                  </div>
                  {i < PIPELINE.length - 1 && (
                    <svg
                      style={{ position: 'absolute', right: -12, top: '50%', transform: 'translateY(-50%)', zIndex: 1 }}
                      width="16"
                      height="14"
                      viewBox="0 0 16 14"
                      fill="none"
                      aria-hidden="true"
                    >
                      <path d="M0 7 H13 M9 3 L13 7 L9 11" stroke="var(--ink-4)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                    </svg>
                  )}
                </div>
              </Fragment>
            ))}
          </div>
        </div>

        <div
          style={{
            padding: '14px 16px',
            background: 'var(--surface-sunken)',
            border: '1px dashed var(--line-2)',
            borderRadius: 10,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              CI/CD pipeline
            </span>
            <span style={{ fontSize: 10, color: 'var(--ink-4)' }}>
              Continuous deployment to Cloud Run on merge to <span className="mono">main</span>
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {CICD.map((c, i) => (
              <Fragment key={c.label}>
                <div
                  style={{
                    flex: '1 1 140px',
                    background: 'var(--surface-card)',
                    border: '1px solid var(--line)',
                    borderRadius: 6,
                    padding: '8px 10px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <span
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 4,
                      background: 'var(--blue-50)',
                      color: 'var(--blue-500)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <c.Icon size={12} />
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink)' }}>{c.label}</div>
                    <div style={{ fontSize: 9, color: 'var(--ink-4)' }}>{c.sub}</div>
                  </div>
                </div>
                {i < CICD.length - 1 && (
                  <svg width="14" height="10" viewBox="0 0 14 10" fill="none" aria-hidden="true">
                    <path d="M0 5 H11 M8 2 L11 5 L8 8" stroke="var(--ink-4)" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                  </svg>
                )}
              </Fragment>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginTop: 16, fontSize: 11, color: 'var(--ink-3)', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 22, height: 2, background: 'var(--ink-4)' }} />
            Document &amp; metadata flow
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <svg width="22" height="6" aria-hidden="true">
              <line x1="0" y1="3" x2="22" y2="3" stroke="var(--ink-4)" strokeWidth="1.5" strokeDasharray="3 3" />
            </svg>
            Async events &amp; webhooks
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#DC2626' }} />
            Telemetry &amp; logging
          </div>
        </div>
      </div>

      <div style={{ marginTop: 20, padding: '14px 16px', border: '1px solid var(--line)', borderRadius: 'var(--r-lg)', background: 'var(--surface-card)' }}>
        <div className="label-eyebrow" style={{ marginBottom: 10 }}>Stack</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {STACK.map((s) => (
            <span key={s} className="pill" style={{ height: 22, fontSize: 11 }}>
              {s}
            </span>
          ))}
        </div>
      </div>
    </>
  )
}
