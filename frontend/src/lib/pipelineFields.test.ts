import { describe, it, expect } from 'vitest'
import { ACROFORM_TO_CANONICAL, fieldsFromPipeline } from './pipelineFields'
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
  '14A CONTRACTOR ADDRESS': '123 Main St',
  '14C CSLB': '1029420',
  '15 OWNER  LESSEE': null,
  'APPLICATION NUMBER': '202602125866',
  'DATE FILED': '2/12/2026',
  ISSUED: '4/24/2026',
  'Check Box8': '/Yes',
  'Check Box9': null,
  '5 NO OF STORIES OF OCCUPANCY': '3',
  '9 NO OF DWELLING UNITS': '1',
  '7 PROPOSED USE LEGAL USE': '1 family dwelling',
  '8 0CCUP CLASS': 'R-3',
  '4 TYPE OF CONSTR': '5',
  '16 DESCRIPTION': 'waterproofing details around windows',
  '16A DESCRIPTION': 'full painting',
}

describe('fieldsFromPipeline', () => {
  it('maps real AcroForm field names to canonical FieldsPanel keys', () => {
    const out = fieldsFromPipeline(REAL_FORM_3_8, 'permit-3-8')

    expect(out.address).toEqual({ v: '250 Red Rock Wy', c: 1.0 })
    expect(out.project_address).toEqual({ v: '250 Red Rock Wy', c: 1.0 })
    expect(out.parcel_number).toEqual({ v: '7515A/072', c: 1.0 })
    expect(out.estimated_cost).toEqual({ v: '$20,254', c: 1.0 })
    expect(out.contractor_name).toEqual({ v: 'AARON EDDY / MAKAI CAPITAL', c: 1.0 })
    expect(out.contractor_address).toEqual({ v: '123 Main St', c: 1.0 })
    expect(out.license_number).toEqual({ v: '1029420', c: 1.0 })
    expect(out.application_number).toEqual({ v: '202602125866', c: 1.0 })
    expect(out.date_filed).toEqual({ v: '2/12/2026', c: 1.0 })
    expect(out.stories).toEqual({ v: '3', c: 1.0 })
    expect(out.dwelling_units).toEqual({ v: '1', c: 1.0 })
    expect(out.proposed_use).toEqual({ v: '1 family dwelling', c: 1.0 })
    expect(out.occupancy_class).toEqual({ v: 'R-3', c: 1.0 })
    expect(out.construction_type).toEqual({ v: '5', c: 1.0 })
  })

  it('falls back to Form 8 widget names (5A, 9A, 7A, 8A, 4A) when Form 3 widget is null', () => {
    const form8: PipelineExtractedFields = {
      '5 NO OF STORIES OF OCCUPANCY': null,
      '5A NO OF STORIES OF OCCUPANCY': '2',
      '9 NO OF DWELLING UNITS': null,
      '9A NO OF DWELLING UNITS': '4',
      '7 PROPOSED USE LEGAL USE': null,
      '7A PRESENT USE': 'office',
      '8 0CCUP CLASS': null,
      '8A 0CCUP CLASS': 'B',
      '4 TYPE OF CONSTR': null,
      '4A TYPE OF CONSTR': '3',
    }
    const out = fieldsFromPipeline(form8, null)
    expect(out.stories).toEqual({ v: '2', c: 1.0 })
    expect(out.dwelling_units).toEqual({ v: '4', c: 1.0 })
    expect(out.proposed_use).toEqual({ v: 'office', c: 1.0 })
    expect(out.occupancy_class).toEqual({ v: 'B', c: 1.0 })
    expect(out.construction_type).toEqual({ v: '3', c: 1.0 })
  })

  it('concatenates description widgets (16, 16A, 16B, 16C, 16D)', () => {
    const out = fieldsFromPipeline(REAL_FORM_3_8, null)
    expect(out.description).toEqual({
      v: 'waterproofing details around windows full painting',
      c: 1.0,
    })
  })

  it('omits description entirely when all description widgets are null or empty', () => {
    const out = fieldsFromPipeline({ '16 DESCRIPTION': null, '16A DESCRIPTION': '' }, null)
    expect(out.description).toBeUndefined()
  })

  it('omits canonical keys whose source field is null or empty', () => {
    const out = fieldsFromPipeline(REAL_FORM_3_8, 'permit-3-8')

    // 15 OWNER  LESSEE is null in the real PDF
    expect(out.applicant_name).toBeUndefined()
    expect(out.owner_name).toBeUndefined()
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

describe('ACROFORM_TO_CANONICAL', () => {
  it('inverts SOURCE_FIELDS so an Issue.field resolves to a canonical row', () => {
    expect(ACROFORM_TO_CANONICAL['1 BLOCK & LOT']).toBe('parcel_number')
    expect(ACROFORM_TO_CANONICAL['2A ESTIMATED COST OF JOB']).toBe('estimated_cost')
    expect(ACROFORM_TO_CANONICAL['14 CONTRACTOR']).toBe('contractor_name')
    expect(ACROFORM_TO_CANONICAL['14C CSLB']).toBe('license_number')
    expect(ACROFORM_TO_CANONICAL['APPLICATION NUMBER']).toBe('application_number')
  })

  it('maps every description widget variant to the description canonical', () => {
    for (const name of ['16 DESCRIPTION', '16A DESCRIPTION', '16B DESCRIPTION', '16C DESCRIPTION', '16D DESCRIPTION']) {
      expect(ACROFORM_TO_CANONICAL[name]).toBe('description')
    }
  })

  it('maps Form 8 widget variants to the same canonical as Form 3', () => {
    expect(ACROFORM_TO_CANONICAL['5A NO OF STORIES OF OCCUPANCY']).toBe('stories')
    expect(ACROFORM_TO_CANONICAL['9A NO OF DWELLING UNITS']).toBe('dwelling_units')
    expect(ACROFORM_TO_CANONICAL['4A TYPE OF CONSTR']).toBe('construction_type')
  })

  it('does not contain entries for AcroForm widgets we do not surface', () => {
    expect(ACROFORM_TO_CANONICAL['Check Box8']).toBeUndefined()
    expect(ACROFORM_TO_CANONICAL.ISSUED).toBeUndefined()
  })
})
