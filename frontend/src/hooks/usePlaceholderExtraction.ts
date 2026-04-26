import { useEffect, useState } from 'react'
import type { ExtractedField, ExtractionState, FieldName } from '@/lib/types'

// Stable string hash so the same classificationId always seeds the same outputs.
function hash(input: string): number {
  let h = 0
  for (let i = 0; i < input.length; i++) {
    h = (h * 31 + input.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

const APPLICANT_NAMES = [
  'John Doe',
  'Maria Hernandez',
  'Aiden Patel',
  'Sofia Nguyen',
  'David Kim',
  'Priya Singh',
]

const ADDRESSES = [
  '123 Main St, Riverview, CA 94501',
  '4218 Oak Avenue, Riverview, CA 94502',
  '88 Sunset Blvd, Riverview, CA 94503',
  '17 Cedar Court, Riverview, CA 94504',
]

const PERMIT_TYPES = [
  'Building Permit - Addition',
  'Building Permit - Remodel',
  'Building Permit - New Construction',
  'Building Permit - Solar PV',
]

const CONTRACTORS = [
  'Doe Construction',
  'Patel Builders',
  'Nguyen Renovations',
  'Kim & Associates',
]

const LICENSES = ['CSLB 987654', 'CSLB 234112', 'CSLB 561902', 'CSLB 778103']

// Different documents will have different MISSING patterns. Two of nine fields
// are missing in any given placeholder so the UI exercises the MISSING badge
// path and varies between submissions.
const MISSING_PATTERNS: FieldName[][] = [
  ['estimated_cost', 'square_footage'],
  ['license_number', 'estimated_cost'],
  ['contractor_name', 'square_footage'],
  ['parcel_number', 'estimated_cost'],
]

function pick<T>(seed: number, arr: T[], offset: number): T {
  return arr[(seed + offset) % arr.length]
}

function buildPlaceholder(classificationId: string) {
  const seed = hash(classificationId || 'unset')
  const applicant = pick(seed, APPLICANT_NAMES, 0)
  const address = pick(seed, ADDRESSES, 1)
  const permit = pick(seed, PERMIT_TYPES, 2)
  const contractor = pick(seed, CONTRACTORS, 3)
  const license = pick(seed, LICENSES, 4)
  const parcel = `RIV-${String((seed % 900) + 100)}-${String((seed * 7) % 900 + 100)}-${String((seed * 13) % 900 + 100)}`
  const estimatedCost = `$${((seed % 480) + 20).toLocaleString()},000`
  const squareFootage = `${(seed % 3500) + 500} sq ft`

  const all: Record<FieldName, ExtractedField> = {
    applicant_name: { value: applicant, source_text: `Applicant Name: ${applicant}` },
    address: { value: address, source_text: `Address: ${address}` },
    permit_type: { value: permit, source_text: `Permit Type: ${permit}` },
    parcel_number: { value: parcel, source_text: `Parcel Number: ${parcel}` },
    project_address: { value: address, source_text: `Project Address: ${address}` },
    contractor_name: { value: contractor, source_text: `Contractor Name: ${contractor}` },
    license_number: { value: license, source_text: `License Number: ${license}` },
    estimated_cost: { value: estimatedCost, source_text: `Estimated Cost: ${estimatedCost}` },
    square_footage: { value: squareFootage, source_text: `Square Footage: ${squareFootage}` },
  }

  const missing = MISSING_PATTERNS[seed % MISSING_PATTERNS.length]
  for (const field of missing) {
    all[field] = { value: null, source_text: null }
  }
  return all
}

export function usePlaceholderExtraction(classificationId: string): ExtractionState {
  const [state, setState] = useState<ExtractionState>({ kind: 'loading' })
  useEffect(() => {
    const t = setTimeout(() => {
      setState({
        kind: 'ok',
        result: {
          fields: buildPlaceholder(classificationId),
          department: 'building',
          department_confidence: 0.96,
          model: 'placeholder',
          prompt_version: 0,
        },
      })
    }, 600)
    return () => clearTimeout(t)
  }, [classificationId])
  return state
}
