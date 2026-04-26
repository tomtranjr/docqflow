import {
  BuildingIcon,
  DocIcon,
  HashIcon,
  Icons,
  PinIcon,
  ShieldIcon,
  SparkleIcon,
  UserIcon,
  WarnIcon,
} from '@/components/brand/icons'
import type { Permit, PermitField } from '@/lib/permitData'
import type { ComponentType } from 'react'
import type { SVGProps } from 'react'

type FieldKey =
  | 'applicant_name'
  | 'address'
  | 'permit_type'
  | 'parcel_number'
  | 'project_address'
  | 'contractor_name'
  | 'license_number'
  | 'estimated_cost'
  | 'square_footage'

interface FieldMeta {
  key: FieldKey
  label: string
  Icon: ComponentType<SVGProps<SVGSVGElement> & { size?: number }>
}

const FIELD_LABELS: FieldMeta[] = [
  { key: 'applicant_name', label: 'Applicant Name', Icon: UserIcon },
  { key: 'address', label: 'Address', Icon: PinIcon },
  { key: 'permit_type', label: 'Permit Type', Icon: DocIcon },
  { key: 'parcel_number', label: 'Parcel Number', Icon: HashIcon },
  { key: 'project_address', label: 'Project Address', Icon: PinIcon },
  { key: 'contractor_name', label: 'Contractor Name', Icon: UserIcon },
  { key: 'license_number', label: 'License Number', Icon: ShieldIcon },
  { key: 'estimated_cost', label: 'Estimated Cost', Icon: HashIcon },
  { key: 'square_footage', label: 'Square Footage', Icon: HashIcon },
]

interface FieldsPanelProps {
  permit: Permit
  fields: Record<string, PermitField>
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

export function FieldsPanel({
  permit,
  fields,
  activeField,
  setActiveField,
  showConfidence,
  onToggleConfidence,
}: FieldsPanelProps) {
  const present = FIELD_LABELS.filter((f) => fields[f.key]?.v).length
  const total = FIELD_LABELS.length
  const completeness = Math.round((present / total) * 100)

  return (
    <>
      <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--line)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="label-eyebrow">Extracted Fields</div>
          <button type="button" onClick={onToggleConfidence} className="btn btn-sm btn-ghost" style={{ fontSize: 11 }}>
            {showConfidence ? 'Hide' : 'Show'} confidence
          </button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
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
        {FIELD_LABELS.map(({ key, label, Icon }) => {
          const data = fields[key] || { v: null, c: 0 }
          const conf = Math.round(data.c * 100)
          const color = confColor(conf)
          const isActive = activeField === key
          return (
            <div
              key={key}
              className={`field-row ${isActive ? 'active' : ''}`}
              onMouseEnter={() => setActiveField(key)}
              onMouseLeave={() => setActiveField(null)}
              style={{
                padding: '12px 18px',
                borderBottom: '1px solid var(--line)',
                display: 'grid',
                gridTemplateColumns: '20px 130px 1fr auto',
                gap: 10,
                alignItems: 'center',
              }}
            >
              <span style={{ color: 'var(--ink-4)' }}>
                <Icon size={14} />
              </span>
              <div className="label-eyebrow" style={{ fontSize: 10, letterSpacing: '0.06em' }}>
                {label}
              </div>
              <div style={{ fontSize: 13, fontWeight: 500, color: data.v ? 'var(--ink)' : 'var(--warn)' }}>
                {data.v || (
                  <span className="pill pill-warn" style={{ fontSize: 10, height: 20 }}>
                    <WarnIcon size={11} /> Missing
                  </span>
                )}
              </div>
              {showConfidence && data.v ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
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
                </div>
              ) : (
                <span style={{ width: 1 }} />
              )}
            </div>
          )
        })}

        <div style={{ padding: '16px 18px', background: 'var(--blue-50)', borderTop: '1px solid var(--line)' }}>
          <div className="label-eyebrow" style={{ marginBottom: 10 }}>Auto-classification</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 10,
                background: 'var(--blue-500)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <BuildingIcon size={18} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{permit.department} Department</div>
              <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>
                Routes to DBI · {permit.department === 'Building' ? 'Plan Check Division' : permit.department}
              </div>
            </div>
            <span className="pill pill-success" style={{ height: 22 }}>
              {Math.round(permit.confidence * 100)}%
            </span>
          </div>
          <div style={{ marginTop: 12 }}>
            <div className="label-eyebrow" style={{ fontSize: 9, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
              <SparkleIcon size={10} />
              Probability distribution
              <span style={{ flex: 1 }} />
              <Icons.cmd size={10} />
            </div>
            {[
              { d: 'Building', v: 96, c: 'var(--blue-500)' },
              { d: 'Electrical', v: 2, c: 'var(--ink-4)' },
              { d: 'Plumbing', v: 1, c: 'var(--ink-4)' },
              { d: 'Zoning', v: 1, c: 'var(--ink-4)' },
            ].map((r) => (
              <div key={r.d} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 11, width: 70, color: 'var(--ink-3)' }}>{r.d}</span>
                <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.6)', borderRadius: 2 }}>
                  <div style={{ width: `${r.v}%`, height: '100%', background: r.c, borderRadius: 2 }} />
                </div>
                <span className="mono tabular" style={{ fontSize: 10, width: 32, textAlign: 'right', color: 'var(--ink-3)' }}>
                  {r.v}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
