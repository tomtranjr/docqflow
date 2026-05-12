import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { toast } from 'sonner'
import type { PermitField } from '@/lib/permitData'
import type { Issue, PipelineResult } from '@/lib/types'
import { FieldsPanel } from './FieldsPanel'

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    info: vi.fn(),
  },
}))

function makeResult(overrides: Partial<PipelineResult> = {}): PipelineResult {
  return {
    document_id: '11111111-2222-3333-4444-555555555555',
    sha256: 'deadbeef',
    llm_profile: 'cloud-fast',
    verdict: 'clean',
    extracted_fields: {},
    issues: [],
    latency_ms: 842,
    ...overrides,
  }
}

function makeIssue(overrides: Partial<Issue> = {}): Issue {
  return {
    kind: 'missing_block_lot',
    severity: 'major',
    field: '1 BLOCK & LOT',
    value: null,
    message: 'Block/lot is empty',
    source: 'rule',
    confidence: null,
    ...overrides,
  }
}

const FIELDS: Record<string, PermitField> = {
  application_number: { v: '202602125866', c: 1.0 },
  project_address: { v: '250 Red Rock Wy', c: 1.0 },
  parcel_number: { v: '7515A/072', c: 1.0 },
}

function renderPanel(overrides: Partial<React.ComponentProps<typeof FieldsPanel>> = {}) {
  const setActiveField = vi.fn()
  const onToggleConfidence = vi.fn()
  const props: React.ComponentProps<typeof FieldsPanel> = {
    fields: FIELDS,
    pipelineResult: null,
    activeField: null,
    setActiveField,
    showConfidence: false,
    onToggleConfidence,
    ...overrides,
  }
  return { ...render(<FieldsPanel {...props} />), setActiveField, onToggleConfidence }
}

beforeEach(() => {
  vi.mocked(toast.success).mockReset()
  vi.mocked(toast.info).mockReset()
})

describe('FieldsPanel', () => {
  it('renders every curated Form 3-8 field as a row', () => {
    renderPanel()
    for (const label of [
      'Application Number',
      'Date Filed',
      'Project Address',
      'Parcel (Block/Lot)',
      'Estimated Cost',
      'Construction Type',
      'Occupancy Class',
      'Proposed Use',
      'Stories',
      'Dwelling Units',
      'Owner / Lessee',
      'Contractor',
      'Contractor Address',
      'License Number',
      'Description',
    ]) {
      expect(screen.getByText(label)).toBeInTheDocument()
    }
  })

  it('shows MISSING badge for fields without a value', () => {
    renderPanel()
    // Only 3 of 15 fields have values in FIELDS, so 12 should be missing.
    expect(screen.getAllByText('Missing').length).toBe(12)
  })

  it('renders the verdict strip when pipelineResult is provided', () => {
    renderPanel({
      pipelineResult: makeResult({ verdict: 'major', latency_ms: 1234, issues: [makeIssue()] }),
    })
    expect(screen.getByRole('status', { name: /verdict: major issues/i })).toBeInTheDocument()
    expect(screen.getByText('cloud-fast')).toBeInTheDocument()
    expect(screen.getByText('1234 ms')).toBeInTheDocument()
  })

  it('omits the verdict strip when pipelineResult is null', () => {
    renderPanel({ pipelineResult: null })
    expect(screen.queryByRole('status', { name: /verdict:/i })).not.toBeInTheDocument()
  })

  it('attaches an issue message to the right field row via ACROFORM_TO_CANONICAL', () => {
    renderPanel({
      pipelineResult: makeResult({
        verdict: 'major',
        issues: [
          makeIssue({
            field: '1 BLOCK & LOT',
            kind: 'missing_block_lot',
            message: 'Block/lot is empty',
            severity: 'major',
          }),
        ],
      }),
    })
    // The "Parcel (Block/Lot)" row should now show the issue message inline.
    const parcelRow = screen.getByText('Parcel (Block/Lot)').closest('.field-row')
    expect(parcelRow).not.toBeNull()
    expect(within(parcelRow as HTMLElement).getByText('Block/lot is empty')).toBeInTheDocument()
  })

  it('renders unmapped issues in an "Other Findings" section', () => {
    renderPanel({
      pipelineResult: makeResult({
        verdict: 'major',
        issues: [
          makeIssue({
            field: 'Check Box8',
            kind: 'missing_form_checkbox',
            message: 'Form 3 vs Form 8 checkbox missing',
            severity: 'major',
          }),
        ],
      }),
    })
    expect(screen.getByText('Other Findings')).toBeInTheDocument()
    expect(screen.getByText('Check Box8')).toBeInTheDocument()
    expect(screen.getByText('Form 3 vs Form 8 checkbox missing')).toBeInTheDocument()
  })

  it('lets the user edit a field locally and shows the Edited badge', async () => {
    const user = userEvent.setup()
    renderPanel()
    await user.click(screen.getByRole('button', { name: 'Edit Application Number' }))
    const input = screen.getByRole('textbox', { name: 'Edit Application Number' })
    await user.clear(input)
    await user.type(input, '999{Enter}')
    expect(screen.getByText('999')).toBeInTheDocument()
    expect(screen.getByText('Edited')).toBeInTheDocument()
  })

  it('Save button is disabled until there are pending edits and toasts on click', async () => {
    const user = userEvent.setup()
    renderPanel()
    const saveBtn = screen.getByRole('button', { name: /save/i })
    expect(saveBtn).toBeDisabled()

    await user.click(screen.getByRole('button', { name: 'Edit Application Number' }))
    const input = screen.getByRole('textbox', { name: 'Edit Application Number' })
    await user.clear(input)
    await user.type(input, 'new-value{Enter}')

    expect(saveBtn).toBeEnabled()
    await user.click(saveBtn)
    expect(toast.success).toHaveBeenCalledWith(
      expect.stringContaining('Saved 1 field locally'),
    )
  })

  it('Escape cancels an in-progress edit without committing', async () => {
    const user = userEvent.setup()
    renderPanel()
    await user.click(screen.getByRole('button', { name: 'Edit Application Number' }))
    const input = screen.getByRole('textbox', { name: 'Edit Application Number' })
    await user.clear(input)
    await user.type(input, 'discard-me{Escape}')
    expect(screen.queryByText('discard-me')).not.toBeInTheDocument()
    expect(screen.queryByText('Edited')).not.toBeInTheDocument()
    // Original value is still rendered.
    expect(screen.getByText('202602125866')).toBeInTheDocument()
  })
})
