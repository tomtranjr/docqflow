import type { PermitField } from './permitData'
import type { FieldName, PipelineExtractedFields } from './types'

// AcroForm names verified against data/permit-3-8/permit-3-8_correct_*.pdf.
// Spaces, double-spaces, and known typos ("0CCUP", "OWNER  LESSEE") are
// preserved verbatim — they are the exact keys pypdf returns.
const SOURCE_FIELDS = {
  applicant_name: '15 OWNER  LESSEE',
  address: '1 STREET ADDRESS OF JOB BLOCK  LOT',
  project_address: '1 STREET ADDRESS OF JOB BLOCK  LOT',
  parcel_number: '1 BLOCK & LOT',
  contractor_name: '14 CONTRACTOR',
  license_number: '14C CSLB',
  estimated_cost: '2A ESTIMATED COST OF JOB',
} as const satisfies Partial<Record<FieldName, string>>

// permit_type comes from the classifier label (no single AcroForm field
// captures it). square_footage has no equivalent on Form 3/8 — left missing.

const PERMIT_TYPE_BY_LABEL: Record<string, string> = {
  'permit-3-8': 'Form 3/8 — Building Addition / Alteration',
}

function humanizeLabel(label: string): string {
  return label.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function stringify(raw: string | boolean | null | undefined): string | null {
  if (raw === null || raw === undefined || raw === '') return null
  if (typeof raw === 'boolean') return raw ? 'Yes' : 'No'
  return String(raw)
}

export function fieldsFromPipeline(
  extracted: PipelineExtractedFields,
  classifierLabel: string | null | undefined,
): Record<string, PermitField> {
  const out: Record<string, PermitField> = {}

  for (const [canonicalKey, sourceKey] of Object.entries(SOURCE_FIELDS) as [
    FieldName,
    string,
  ][]) {
    const value = stringify(extracted[sourceKey])
    if (value !== null) {
      out[canonicalKey] = { v: value, c: 1.0 }
    }
  }

  if (classifierLabel) {
    out.permit_type = {
      v: PERMIT_TYPE_BY_LABEL[classifierLabel] ?? humanizeLabel(classifierLabel),
      c: 1.0,
    }
  }

  return out
}
