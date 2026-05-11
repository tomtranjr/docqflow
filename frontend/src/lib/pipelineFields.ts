import type { PermitField } from './permitData'
import type { PipelineExtractedFields } from './types'

// Mirrors src/api/pdf_fields.py _FIELD_MAP. Each canonical key has one or more
// candidate AcroForm widget names; the first non-empty value wins (Form 3 vs
// Form 8 widgets share a canonical key — e.g. "5 NO OF STORIES" / "5A NO OF
// STORIES"). AcroForm names are preserved verbatim including double-spaces,
// the "0CCUP" typo, etc. — these are the exact keys pypdf returns.
const SOURCE_FIELDS: Record<string, readonly string[]> = {
  application_number: ['APPLICATION NUMBER'],
  date_filed: ['DATE FILED'],
  applicant_name: ['15 OWNER  LESSEE'],
  owner_name: ['15 OWNER  LESSEE'],
  address: ['1 STREET ADDRESS OF JOB BLOCK  LOT'],
  project_address: ['1 STREET ADDRESS OF JOB BLOCK  LOT'],
  parcel_number: ['1 BLOCK & LOT'],
  estimated_cost: ['2A ESTIMATED COST OF JOB'],
  stories: ['5 NO OF STORIES OF OCCUPANCY', '5A NO OF STORIES OF OCCUPANCY'],
  dwelling_units: ['9 NO OF DWELLING UNITS', '9A NO OF DWELLING UNITS'],
  proposed_use: ['7 PROPOSED USE LEGAL USE', '7A PRESENT USE'],
  occupancy_class: ['8 0CCUP CLASS', '8A 0CCUP CLASS'],
  construction_type: ['4 TYPE OF CONSTR', '4A TYPE OF CONSTR'],
  contractor_name: ['14 CONTRACTOR'],
  contractor_address: ['14A CONTRACTOR ADDRESS'],
  license_number: ['14C CSLB'],
}

const DESCRIPTION_FIELDS = [
  '16 DESCRIPTION',
  '16A DESCRIPTION',
  '16B DESCRIPTION',
  '16C DESCRIPTION',
  '16D DESCRIPTION',
] as const

// Inverse: AcroForm widget name -> canonical key. Used to attach an Issue
// (whose `field` is a verbatim AcroForm name) to the right FieldsPanel row.
// When several canonical keys share a source widget (e.g. both `address` and
// `project_address` point at "1 STREET ADDRESS OF JOB BLOCK  LOT"), the
// first declared key in SOURCE_FIELDS wins — order matters.
export const ACROFORM_TO_CANONICAL: Record<string, string> = (() => {
  const out: Record<string, string> = {}
  for (const [canonical, sources] of Object.entries(SOURCE_FIELDS)) {
    for (const source of sources) {
      if (!(source in out)) out[source] = canonical
    }
  }
  for (const source of DESCRIPTION_FIELDS) {
    if (!(source in out)) out[source] = 'description'
  }
  return out
})()

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
  const s = String(raw).trim()
  return s === '' ? null : s
}

export function fieldsFromPipeline(
  extracted: PipelineExtractedFields,
  classifierLabel: string | null | undefined,
): Record<string, PermitField> {
  const out: Record<string, PermitField> = {}

  for (const [canonical, sources] of Object.entries(SOURCE_FIELDS)) {
    for (const source of sources) {
      const value = stringify(extracted[source])
      if (value !== null) {
        out[canonical] = { v: value, c: 1.0 }
        break
      }
    }
  }

  const descriptionParts = DESCRIPTION_FIELDS.map((name) => stringify(extracted[name])).filter(
    (s): s is string => s !== null,
  )
  if (descriptionParts.length > 0) {
    out.description = { v: descriptionParts.join(' '), c: 1.0 }
  }

  if (classifierLabel) {
    out.permit_type = {
      v: PERMIT_TYPE_BY_LABEL[classifierLabel] ?? humanizeLabel(classifierLabel),
      c: 1.0,
    }
  }

  return out
}
