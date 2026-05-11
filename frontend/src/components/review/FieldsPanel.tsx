import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
  BuildingIcon,
  CheckIcon,
  ClockIcon,
  DocIcon,
  EditIcon,
  HashIcon,
  PinIcon,
  ShieldIcon,
  SparkleIcon,
  UserIcon,
  WarnIcon,
  XIcon,
} from '@/components/brand/icons'
import type { PermitField } from '@/lib/permitData'
import { ACROFORM_TO_CANONICAL } from '@/lib/pipelineFields'
import type { Issue, PipelineResult, Severity, Verdict } from '@/lib/types'
import type { ComponentType, SVGProps } from 'react'

interface FieldMeta {
  key: string
  label: string
  Icon: ComponentType<SVGProps<SVGSVGElement> & { size?: number }>
}

// Curated Form 3-8 review surface. Mirrors src/api/pdf_fields.py _FIELD_MAP.
const FIELD_LABELS: FieldMeta[] = [
  { key: 'application_number', label: 'Application Number', Icon: HashIcon },
  { key: 'date_filed', label: 'Date Filed', Icon: ClockIcon },
  { key: 'project_address', label: 'Project Address', Icon: PinIcon },
  { key: 'parcel_number', label: 'Parcel (Block/Lot)', Icon: HashIcon },
  { key: 'estimated_cost', label: 'Estimated Cost', Icon: HashIcon },
  { key: 'construction_type', label: 'Construction Type', Icon: BuildingIcon },
  { key: 'occupancy_class', label: 'Occupancy Class', Icon: BuildingIcon },
  { key: 'proposed_use', label: 'Proposed Use', Icon: DocIcon },
  { key: 'stories', label: 'Stories', Icon: BuildingIcon },
  { key: 'dwelling_units', label: 'Dwelling Units', Icon: BuildingIcon },
  { key: 'owner_name', label: 'Owner / Lessee', Icon: UserIcon },
  { key: 'contractor_name', label: 'Contractor', Icon: UserIcon },
  { key: 'contractor_address', label: 'Contractor Address', Icon: PinIcon },
  { key: 'license_number', label: 'License Number', Icon: ShieldIcon },
  { key: 'description', label: 'Description', Icon: DocIcon },
]

const FIELD_LABEL_KEYS = new Set(FIELD_LABELS.map((f) => f.key))

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

const SEVERITY_PILL_CLASS: Record<Severity, string> = {
  major: 'pill-danger',
  minor: 'pill-warn',
}

interface FieldsPanelProps {
  fields: Record<string, PermitField>
  pipelineResult: PipelineResult | null
  activeField: string | null
  setActiveField: (key: string | null) => void
  showConfidence: boolean
  onToggleConfidence: () => void
}

function confColor(pct: number): string {
  if (pct >= 90) return 'var(--ok)'
  if (pct >= 75) return 'var(--blue-500)'
  if (pct >= 60) return 'var(--warn)'
  return 'var(--danger)'
}

// Bucket issues by which FieldsPanel row they should appear under. An issue's
// raw AcroForm field name is mapped to a canonical key via ACROFORM_TO_CANONICAL;
// if the canonical isn't one of FIELD_LABELS we keep the issue under its raw
// field name so the panel can still render the finding instead of dropping it.
function groupIssuesByRow(issues: readonly Issue[]): {
  matched: Map<string, Issue[]>
  extra: Map<string, Issue[]>
} {
  const matched = new Map<string, Issue[]>()
  const extra = new Map<string, Issue[]>()
  for (const issue of issues) {
    const canonical = ACROFORM_TO_CANONICAL[issue.field]
    const target =
      canonical && FIELD_LABEL_KEYS.has(canonical)
        ? { map: matched, key: canonical }
        : { map: extra, key: issue.field }
    const list = target.map.get(target.key) ?? []
    list.push(issue)
    target.map.set(target.key, list)
  }
  return { matched, extra }
}

export function FieldsPanel({
  fields,
  pipelineResult,
  activeField,
  setActiveField,
  showConfidence,
  onToggleConfidence,
}: FieldsPanelProps) {
  const [edits, setEdits] = useState<Record<string, string>>({})
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [draft, setDraft] = useState('')

  const { matched: issuesByKey, extra: extraIssues } = useMemo(
    () => groupIssuesByRow(pipelineResult?.issues ?? []),
    [pipelineResult],
  )

  const valueFor = (key: string): string | null => {
    if (key in edits) return edits[key] || null
    return fields[key]?.v ?? null
  }

  const present = FIELD_LABELS.filter((f) => valueFor(f.key)).length
  const total = FIELD_LABELS.length
  const completeness = Math.round((present / total) * 100)

  const startEdit = (key: string) => {
    setEditingKey(key)
    setDraft(valueFor(key) ?? '')
  }
  const commitEdit = () => {
    if (editingKey === null) return
    setEdits((prev) => ({ ...prev, [editingKey]: draft.trim() }))
    setEditingKey(null)
  }
  const cancelEdit = () => {
    setEditingKey(null)
    setDraft('')
  }
  const handleSaveAll = () => {
    const count = Object.keys(edits).length
    if (count === 0) {
      toast.info('No changes to save')
      return
    }
    toast.success(`Saved ${count} field${count === 1 ? '' : 's'} locally (backend persistence pending)`)
  }

  return (
    <>
      <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--line)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="label-eyebrow">Extracted Fields</div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <button
              type="button"
              onClick={handleSaveAll}
              className="btn btn-sm btn-warn"
              style={{ fontSize: 11 }}
              disabled={Object.keys(edits).length === 0}
            >
              <CheckIcon size={11} /> Save
            </button>
            <button type="button" onClick={onToggleConfidence} className="btn btn-sm btn-ghost" style={{ fontSize: 11 }}>
              {showConfidence ? 'Hide' : 'Show'} confidence
            </button>
          </div>
        </div>

        {pipelineResult && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginTop: 10,
              flexWrap: 'wrap',
              fontSize: 11,
              color: 'var(--ink-3)',
            }}
          >
            <span
              className={`pill ${VERDICT_PILL_CLASS[pipelineResult.verdict]} pill-dot`}
              data-verdict={pipelineResult.verdict}
              role="status"
              aria-label={`Verdict: ${VERDICT_LABEL[pipelineResult.verdict]}`}
              style={{ height: 22 }}
            >
              {VERDICT_LABEL[pipelineResult.verdict]}
            </span>
            <span>
              <span style={{ color: 'var(--ink-4)' }}>profile</span>{' '}
              <span className="mono">{pipelineResult.llm_profile}</span>
            </span>
            <span>
              <span style={{ color: 'var(--ink-4)' }}>latency</span>{' '}
              <span className="mono tabular">{pipelineResult.latency_ms} ms</span>
            </span>
            <span>
              <span style={{ color: 'var(--ink-4)' }}>issues</span>{' '}
              <span className="mono tabular">{pipelineResult.issues.length}</span>
            </span>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
          <div
            style={{
              flex: 1,
              height: 6,
              borderRadius: 3,
              background: 'var(--surface-sunken)',
              overflow: 'hidden',
              display: 'flex',
            }}
          >
            <div style={{ width: `${completeness}%`, background: 'var(--ok)' }} />
            <div style={{ width: `${100 - completeness}%`, background: 'var(--warn-bg)' }} />
          </div>
          <span className="mono tabular" style={{ fontSize: 11, fontWeight: 600 }}>
            {completeness}%
          </span>
        </div>
        <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 4 }}>
          {present} of {total} fields extracted · {total - present} missing
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto' }}>
        {FIELD_LABELS.map(({ key, label, Icon }) => (
          <FieldRow
            key={key}
            rowKey={key}
            label={label}
            Icon={Icon}
            value={valueFor(key)}
            edited={key in edits}
            confidence={fields[key]?.c ?? 0}
            isActive={activeField === key}
            isEditing={editingKey === key}
            draft={draft}
            setDraft={setDraft}
            onHover={() => setActiveField(key)}
            onLeave={() => setActiveField(null)}
            onStartEdit={() => startEdit(key)}
            onCommit={commitEdit}
            onCancel={cancelEdit}
            showConfidence={showConfidence}
            issues={issuesByKey.get(key) ?? []}
          />
        ))}

        {extraIssues.size > 0 && (
          <>
            <div
              style={{
                padding: '10px 18px',
                background: 'var(--surface-sunken)',
                borderTop: '1px solid var(--line)',
                borderBottom: '1px solid var(--line)',
              }}
            >
              <div className="label-eyebrow" style={{ fontSize: 10 }}>
                Other Findings
              </div>
              <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>
                Issues on fields not in the curated review list.
              </div>
            </div>
            {[...extraIssues.entries()].map(([rawField, issues]) => (
              <div key={rawField} style={{ padding: '10px 18px', borderBottom: '1px solid var(--line)' }}>
                <div className="mono" style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 4 }} title={rawField}>
                  {rawField}
                </div>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {issues.map((issue, i) => (
                    <IssueLine key={`${issue.kind}-${i}`} issue={issue} />
                  ))}
                </ul>
              </div>
            ))}
          </>
        )}
      </div>
    </>
  )
}

interface FieldRowProps {
  rowKey: string
  label: string
  Icon: ComponentType<SVGProps<SVGSVGElement> & { size?: number }>
  value: string | null
  edited: boolean
  confidence: number
  isActive: boolean
  isEditing: boolean
  draft: string
  setDraft: (v: string) => void
  onHover: () => void
  onLeave: () => void
  onStartEdit: () => void
  onCommit: () => void
  onCancel: () => void
  showConfidence: boolean
  issues: Issue[]
}

function FieldRow({
  rowKey,
  label,
  Icon,
  value,
  edited,
  confidence,
  isActive,
  isEditing,
  draft,
  setDraft,
  onHover,
  onLeave,
  onStartEdit,
  onCommit,
  onCancel,
  showConfidence,
  issues,
}: FieldRowProps) {
  const conf = Math.round(confidence * 100)
  const color = confColor(conf)

  return (
    <div
      className={`field-row ${isActive ? 'active' : ''}`}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      style={{
        padding: '10px 18px',
        borderBottom: '1px solid var(--line)',
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '20px 140px 1fr auto',
          gap: 10,
          alignItems: 'center',
        }}
      >
        <span style={{ color: 'var(--ink-4)' }}>
          <Icon size={14} />
        </span>
        <div className="label-eyebrow" style={{ fontSize: 10, letterSpacing: '0.06em' }}>
          {label}
          {edited && (
            <span
              className="pill pill-info"
              style={{ marginLeft: 6, height: 16, fontSize: 9 }}
              title="Edited locally — not yet saved"
            >
              Edited
            </span>
          )}
        </div>
        {isEditing ? (
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onCommit()
              if (e.key === 'Escape') onCancel()
            }}
            onBlur={onCommit}
            aria-label={`Edit ${label}`}
            style={{
              fontSize: 13,
              padding: '4px 8px',
              border: '1px solid var(--blue-500)',
              borderRadius: 4,
              minWidth: 0,
              width: '100%',
            }}
          />
        ) : (
          // Clickable value display. No aria-label — the visible value text
          // (or "Missing" pill) is the accessible name. The pencil button is
          // the canonical "Edit X" affordance for screen readers.
          <button
            type="button"
            onClick={onStartEdit}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              textAlign: 'left',
              fontSize: 13,
              fontWeight: 500,
              color: value ? 'var(--ink)' : 'var(--warn)',
              minWidth: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {value || (
              <span className="pill pill-warn" style={{ fontSize: 10, height: 20 }}>
                <WarnIcon size={11} /> Missing
              </span>
            )}
          </button>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {showConfidence && value && !isEditing && (
            <>
              <svg width="36" height="14" viewBox="0 0 36 14" aria-hidden="true">
                {Array.from({ length: 8 }, (_, i) => {
                  const h = Math.sin(i + conf * 0.05) * 4 + (conf / 100) * 12
                  return (
                    <rect
                      key={i}
                      x={i * 4.5}
                      y={Math.max(0, 14 - h)}
                      width="3"
                      height={h}
                      fill={color}
                      opacity={0.4 + (i / 8) * 0.6}
                    />
                  )
                })}
              </svg>
              <span className="mono tabular" style={{ fontSize: 11, fontWeight: 600, color }}>
                {conf}%
              </span>
            </>
          )}
          {isEditing ? (
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              aria-label={`Cancel edit ${label}`}
              onMouseDown={(e) => {
                e.preventDefault()
                onCancel()
              }}
              style={{ padding: '2px 4px' }}
            >
              <XIcon size={11} />
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              aria-label={`Edit ${label}`}
              onClick={onStartEdit}
              style={{ padding: '2px 4px' }}
              data-field-edit={rowKey}
            >
              <EditIcon size={11} />
            </button>
          )}
        </div>
      </div>

      {issues.length > 0 && (
        <ul style={{ listStyle: 'none', padding: 0, margin: '8px 0 0 30px' }}>
          {issues.map((issue, i) => (
            <IssueLine key={`${issue.kind}-${i}`} issue={issue} />
          ))}
        </ul>
      )}
    </div>
  )
}

function IssueLine({ issue }: { issue: Issue }) {
  const isLlm = issue.source === 'llm'
  const SourceIcon = isLlm ? SparkleIcon : ShieldIcon
  const confPct = issue.confidence !== null ? Math.round(issue.confidence * 100) : null
  return (
    <li style={{ marginTop: 4, display: 'flex', alignItems: 'flex-start', gap: 6, flexWrap: 'wrap' }}>
      <span
        className={`pill ${SEVERITY_PILL_CLASS[issue.severity]}`}
        style={{ height: 18, fontSize: 9 }}
      >
        {issue.severity}
      </span>
      <span
        className="pill pill-info"
        style={{ height: 18, fontSize: 9, gap: 3 }}
        aria-label={isLlm ? 'LLM judgment (Stage 6)' : 'Rule finding (Stage 5)'}
      >
        <SourceIcon size={10} />
        {issue.source}
        {confPct !== null && <span className="mono tabular">· {confPct}%</span>}
      </span>
      <span style={{ fontSize: 12, color: 'var(--ink)', flex: '1 1 200px' }}>{issue.message}</span>
    </li>
  )
}
