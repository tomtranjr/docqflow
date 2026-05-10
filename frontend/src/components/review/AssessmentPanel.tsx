import { CheckIcon, ShieldIcon, SparkleIcon } from '@/components/brand/icons'
import type { Issue, PipelineResult, Severity, Verdict } from '@/lib/types'

const VERDICT_LABEL: Record<Verdict, string> = {
  clean: 'Clean',
  minor: 'Minor issues',
  major: 'Major issues',
}

const VERDICT_PILL_CLASS: Record<Verdict, string> = {
  clean: 'pill-success',
  minor: 'pill-warn',
  major: 'pill-danger',
}

const SEVERITY_ORDER: readonly Severity[] = ['major', 'minor'] as const

const SEVERITY_LABEL: Record<Severity, string> = {
  major: 'Major',
  minor: 'Minor',
}

const SEVERITY_PILL_CLASS: Record<Severity, string> = {
  major: 'pill-danger',
  minor: 'pill-warn',
}

interface AssessmentPanelProps {
  result: PipelineResult | null
}

function groupIssuesBySeverity(issues: readonly Issue[]): Record<Severity, Issue[]> {
  const out: Record<Severity, Issue[]> = { major: [], minor: [] }
  for (const issue of issues) out[issue.severity].push(issue)
  return out
}

export function AssessmentPanel({ result }: AssessmentPanelProps) {
  if (!result) {
    return (
      <div style={{ padding: '16px 18px' }}>
        <div className="label-eyebrow" style={{ marginBottom: 8 }}>
          Pipeline assessment
        </div>
        <p style={{ fontSize: 12, color: 'var(--ink-3)', margin: 0 }}>
          Pipeline assessment is not available for this document. Fields are still extracted from the
          AcroForm and shown in the Fields tab.
        </p>
      </div>
    )
  }

  const grouped = groupIssuesBySeverity(result.issues)
  const totalIssues = result.issues.length
  const ruleCount = result.issues.filter((i) => i.source === 'rule').length
  const llmCount = result.issues.filter((i) => i.source === 'llm').length

  return (
    <>
      <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--line)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <div className="label-eyebrow">Pipeline assessment</div>
          <span
            className={`pill ${VERDICT_PILL_CLASS[result.verdict]} pill-dot`}
            data-verdict={result.verdict}
            role="status"
            aria-label={`Verdict: ${VERDICT_LABEL[result.verdict]}`}
            style={{ height: 22 }}
          >
            {VERDICT_LABEL[result.verdict]}
          </span>
        </div>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '4px 14px',
            marginTop: 8,
            fontSize: 11,
            color: 'var(--ink-3)',
          }}
        >
          <span>
            <span style={{ color: 'var(--ink-4)' }}>profile</span>{' '}
            <span className="mono">{result.llm_profile}</span>
          </span>
          <span>
            <span style={{ color: 'var(--ink-4)' }}>latency</span>{' '}
            <span className="mono tabular">{result.latency_ms} ms</span>
          </span>
          <span>
            <span style={{ color: 'var(--ink-4)' }}>issues</span>{' '}
            <span className="mono tabular">{totalIssues}</span>
            {totalIssues > 0 && (
              <>
                {' '}
                <span style={{ color: 'var(--ink-4)' }}>
                  ({ruleCount} rule · {llmCount} llm)
                </span>
              </>
            )}
          </span>
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto' }}>
        {totalIssues === 0 ? (
          <div
            style={{
              padding: '24px 18px',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <span style={{ color: 'var(--ok)' }}>
              <CheckIcon size={16} />
            </span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
                No issues detected
              </div>
              <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>
                Stages 5 and 6 cleared this submission with no findings.
              </div>
            </div>
          </div>
        ) : (
          SEVERITY_ORDER.map((sev) => (
            <SeverityGroup key={sev} severity={sev} issues={grouped[sev]} />
          ))
        )}
      </div>
    </>
  )
}

function SeverityGroup({ severity, issues }: { severity: Severity; issues: Issue[] }) {
  if (issues.length === 0) return null
  return (
    <section aria-label={`${severity} issues`}>
      <div
        style={{
          padding: '10px 18px',
          borderBottom: '1px solid var(--line)',
          background: 'var(--surface-sunken)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <span className={`pill ${SEVERITY_PILL_CLASS[severity]}`} style={{ height: 20, fontSize: 10 }}>
          {SEVERITY_LABEL[severity]}
        </span>
        <span className="label-eyebrow" style={{ fontSize: 10 }}>
          {issues.length} finding{issues.length !== 1 ? 's' : ''}
        </span>
      </div>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {issues.map((issue, i) => (
          <IssueRow key={`${issue.kind}-${issue.field}-${i}`} issue={issue} />
        ))}
      </ul>
    </section>
  )
}

function IssueRow({ issue }: { issue: Issue }) {
  const isLlm = issue.source === 'llm'
  const SourceIcon = isLlm ? SparkleIcon : ShieldIcon
  const sourcePillClass = isLlm ? 'pill-warn' : 'pill-info'
  const confPct = issue.confidence !== null ? Math.round(issue.confidence * 100) : null

  return (
    <li
      style={{
        padding: '12px 18px',
        borderBottom: '1px solid var(--line)',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span
          className={`pill ${sourcePillClass}`}
          style={{ height: 20, fontSize: 10, gap: 4 }}
          aria-label={isLlm ? 'LLM judgment (Stage 6)' : 'Rule finding (Stage 5)'}
        >
          <SourceIcon size={11} />
          {issue.source}
          {confPct !== null && (
            <span className="mono tabular" style={{ fontWeight: 600 }}>
              · {confPct}%
            </span>
          )}
        </span>
        <span className="mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>
          {issue.kind}
        </span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: 10, alignItems: 'baseline' }}>
        <span
          className="label-eyebrow"
          style={{ fontSize: 9, letterSpacing: '0.06em' }}
          title={issue.field}
        >
          {issue.field}
        </span>
        <span style={{ fontSize: 13, color: 'var(--ink)', wordBreak: 'break-word' }}>
          {issue.message}
        </span>
      </div>
      {issue.value !== null && issue.value !== '' && (
        <div
          className="mono"
          style={{
            fontSize: 11,
            color: 'var(--ink-3)',
            background: 'var(--surface-sunken)',
            padding: '4px 8px',
            borderRadius: 4,
            wordBreak: 'break-word',
          }}
          title={issue.value}
        >
          value: {issue.value}
        </div>
      )}
    </li>
  )
}
