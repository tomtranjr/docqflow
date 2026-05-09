import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import type { Issue, PipelineResult, Severity, Verdict } from '@/lib/types'

const VERDICT_LABEL: Record<Verdict, string> = {
  clean: 'Clean',
  minor: 'Minor issues',
  major: 'Major issues',
}

const VERDICT_TONE: Record<Verdict, string> = {
  clean: 'border-emerald-300 bg-emerald-100 text-emerald-900',
  minor: 'border-amber-300 bg-amber-100 text-amber-900',
  major: 'border-rose-300 bg-rose-100 text-rose-900',
}

function VerdictPill({ verdict }: { verdict: Verdict }) {
  return (
    <span
      role="status"
      aria-label={`Verdict: ${VERDICT_LABEL[verdict]}`}
      data-verdict={verdict}
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-semibold ${VERDICT_TONE[verdict]}`}
    >
      <span className="h-2 w-2 rounded-full bg-current" aria-hidden="true" />
      {VERDICT_LABEL[verdict]}
    </span>
  )
}

function IssueRow({ issue }: { issue: Issue }) {
  return (
    <li className="grid grid-cols-[200px_1fr_120px] gap-3 border-b border-[var(--color-border)] px-4 py-3 text-sm last:border-b-0">
      <div className="min-w-0">
        <div className="font-mono text-xs text-[var(--color-text-secondary)]">{issue.kind}</div>
        <div className="truncate font-semibold text-[var(--color-text-primary)]" title={issue.field}>
          {issue.field}
        </div>
      </div>
      <div className="min-w-0">
        <div className="text-[var(--color-text-primary)]">{issue.message}</div>
        {issue.value !== null && issue.value !== '' && (
          <div
            className="mt-1 truncate font-mono text-xs text-[var(--color-text-secondary)]"
            title={issue.value ?? ''}
          >
            value: {issue.value}
          </div>
        )}
      </div>
      <div className="text-right text-xs text-[var(--color-text-secondary)]">
        <div>{issue.source}</div>
        {issue.confidence !== null && <div>{Math.round(issue.confidence * 100)}%</div>}
      </div>
    </li>
  )
}

function IssueGroup({ severity, issues }: { severity: Severity; issues: Issue[] }) {
  if (issues.length === 0) return null
  return (
    <section aria-label={`${severity} issues`}>
      <h3 className="border-b border-[var(--color-border)] bg-[var(--color-surface-alt)] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">
        {severity} ({issues.length})
      </h3>
      <ul className="m-0 list-none p-0">
        {issues.map((issue, i) => (
          <IssueRow key={`${issue.kind}-${issue.field}-${i}`} issue={issue} />
        ))}
      </ul>
    </section>
  )
}

function formatExtractedValue(v: string | boolean | null): string {
  if (v === null) return '—'
  if (typeof v === 'boolean') return v ? '✓' : '✗'
  return v
}

export function PipelineResultPanel({ result }: { result: PipelineResult }) {
  const [showFields, setShowFields] = useState(false)
  const major = result.issues.filter((i) => i.severity === 'major')
  const minor = result.issues.filter((i) => i.severity === 'minor')
  const fieldEntries = Object.entries(result.extracted_fields)

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-wrap items-center justify-between gap-3 rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
        <VerdictPill verdict={result.verdict} />
        <dl className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--color-text-secondary)]">
          <div className="inline-flex gap-1">
            <dt>profile:</dt>
            <dd className="font-mono">{result.llm_profile}</dd>
          </div>
          <div className="inline-flex gap-1">
            <dt>latency:</dt>
            <dd>{result.latency_ms} ms</dd>
          </div>
          <div className="inline-flex gap-1">
            <dt>issues:</dt>
            <dd>{result.issues.length}</dd>
          </div>
        </dl>
      </header>

      {result.issues.length === 0 ? (
        <p className="rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm text-[var(--color-text-secondary)]">
          No issues detected.
        </p>
      ) : (
        <div className="overflow-hidden rounded border border-[var(--color-border)] bg-[var(--color-surface)]">
          <IssueGroup severity="major" issues={major} />
          <IssueGroup severity="minor" issues={minor} />
        </div>
      )}

      <section className="rounded border border-[var(--color-border)] bg-[var(--color-surface)]">
        <button
          type="button"
          onClick={() => setShowFields((v) => !v)}
          aria-expanded={showFields}
          aria-controls="pipeline-extracted-fields"
          className="flex w-full cursor-pointer items-center justify-between gap-2 px-4 py-3 text-left text-sm font-semibold text-[var(--color-text-primary)]"
        >
          <span className="inline-flex items-center gap-2">
            {showFields ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            Extracted fields ({fieldEntries.length})
          </span>
        </button>
        {showFields && (
          <ul
            id="pipeline-extracted-fields"
            className="m-0 list-none border-t border-[var(--color-border)] p-0"
          >
            {fieldEntries.map(([name, value]) => (
              <li
                key={name}
                className="grid grid-cols-[1fr_2fr] gap-3 border-b border-[var(--color-border)] px-4 py-2 text-sm last:border-b-0"
              >
                <span
                  className="truncate font-mono text-xs text-[var(--color-text-secondary)]"
                  title={name}
                >
                  {name}
                </span>
                <span className="truncate" title={formatExtractedValue(value)}>
                  {formatExtractedValue(value)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
