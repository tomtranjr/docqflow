import { render, screen } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import { PreferencesProvider } from '@/context/PreferencesContext'
import { ExtractedFieldsPanel } from './ExtractedFieldsPanel'
import type { ExtractionResult, ExtractionState } from '@/lib/types'

const okResult: ExtractionResult = {
  fields: {
    applicant_name: { value: 'Jane Doe', source_text: 'Applicant Name: Jane Doe' },
    address: { value: null, source_text: null },
    permit_type: { value: 'Building', source_text: 'Permit Type: Building' },
    parcel_number: { value: null, source_text: null },
    project_address: { value: null, source_text: null },
    contractor_name: { value: null, source_text: null },
    license_number: { value: null, source_text: null },
    estimated_cost: { value: null, source_text: null },
    square_footage: { value: null, source_text: null },
  },
  department: 'building',
  department_confidence: 0.9,
  model: 'placeholder',
  prompt_version: 0,
}

beforeEach(() => localStorage.clear())

describe('ExtractedFieldsPanel', () => {
  it('renders skeletons while loading', () => {
    const state: ExtractionState = { kind: 'loading' }
    render(
      <PreferencesProvider>
        <ExtractedFieldsPanel state={state} />
      </PreferencesProvider>,
    )
    expect(screen.getAllByLabelText('Loading field').length).toBeGreaterThan(0)
  })

  it('renders all 9 field rows when state is ok', () => {
    const state: ExtractionState = { kind: 'ok', result: okResult }
    render(
      <PreferencesProvider>
        <ExtractedFieldsPanel state={state} />
      </PreferencesProvider>,
    )
    expect(screen.getByText('Jane Doe')).toBeInTheDocument()
    expect(screen.getAllByText('MISSING').length).toBe(7)
  })
})
