import { describe, it, expect } from 'vitest'
import { fieldsFromPipeline } from './pipelineFields'
import type { PipelineExtractedFields } from './types'

// Sample taken verbatim from `pypdf.PdfReader.get_fields()` against
// data/permit-3-8/permit-3-8_correct_202602125866.pdf — the same PDF the
// Review screen renders. Keeping AcroForm names exactly as they come off
// disk (double spaces, "0CCUP" typo, etc.) is the whole point of this test.
const REAL_FORM_3_8: PipelineExtractedFields = {
  '1 STREET ADDRESS OF JOB BLOCK  LOT': '250 Red Rock Wy',
  '1 BLOCK & LOT': '7515A/072',
  '2A ESTIMATED COST OF JOB': '$20,254',
  '14 CONTRACTOR': 'AARON EDDY / MAKAI CAPITAL',
  '14C CSLB': '1029420',
  '15 OWNER  LESSEE': null,
  'APPLICATION NUMBER': '202602125866',
  'DATE FILED': '2/12/2026',
  ISSUED: '4/24/2026',
  'Check Box8': '/Yes',
  'Check Box9': null,
}

describe('fieldsFromPipeline', () => {
  it('maps real AcroForm field names to canonical FieldsPanel keys', () => {
    const out = fieldsFromPipeline(REAL_FORM_3_8, 'permit-3-8')

    expect(out.address).toEqual({ v: '250 Red Rock Wy', c: 1.0 })
    expect(out.project_address).toEqual({ v: '250 Red Rock Wy', c: 1.0 })
    expect(out.parcel_number).toEqual({ v: '7515A/072', c: 1.0 })
    expect(out.estimated_cost).toEqual({ v: '$20,254', c: 1.0 })
    expect(out.contractor_name).toEqual({ v: 'AARON EDDY / MAKAI CAPITAL', c: 1.0 })
    expect(out.license_number).toEqual({ v: '1029420', c: 1.0 })
  })

  it('omits canonical keys whose source field is null or empty', () => {
    const out = fieldsFromPipeline(REAL_FORM_3_8, 'permit-3-8')

    // 15 OWNER  LESSEE is null in the real PDF
    expect(out.applicant_name).toBeUndefined()
    // No source field on Form 3/8
    expect(out.square_footage).toBeUndefined()
  })

  it('derives permit_type from the classifier label', () => {
    expect(fieldsFromPipeline({}, 'permit-3-8').permit_type).toEqual({
      v: 'Form 3/8 — Building Addition / Alteration',
      c: 1.0,
    })

    expect(fieldsFromPipeline({}, 'permit-other-type').permit_type).toEqual({
      v: 'Permit Other Type',
      c: 1.0,
    })
  })

  it('omits permit_type when no label is available', () => {
    expect(fieldsFromPipeline({}, null).permit_type).toBeUndefined()
    expect(fieldsFromPipeline({}, undefined).permit_type).toBeUndefined()
    expect(fieldsFromPipeline({}, '').permit_type).toBeUndefined()
  })

  it('handles boolean (checkbox) source values defensively', () => {
    // Not currently used for any canonical field, but the contract is
    // PipelineExtractedFields = string | boolean | null. Verify the
    // boolean branch is covered so future mappings don't crash.
    const out = fieldsFromPipeline(
      { '1 STREET ADDRESS OF JOB BLOCK  LOT': true } as PipelineExtractedFields,
      null,
    )
    expect(out.address).toEqual({ v: 'Yes', c: 1.0 })
  })

  it('returns an empty object for empty input and no label', () => {
    expect(fieldsFromPipeline({}, null)).toEqual({})
  })
})
