import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import type { Issue, PipelineResult } from '@/lib/types'
import { AssessmentPanel } from './AssessmentPanel'

function makeIssue(overrides: Partial<Issue>): Issue {
  return {
    kind: 'missing_description',
    severity: 'major',
    field: '16 DESCRIPTION',
    value: null,
    message: 'Description fields are all empty',
    source: 'rule',
    confidence: null,
    ...overrides,
  }
}

function makeResult(overrides: Partial<PipelineResult> = {}): PipelineResult {
  return {
    document_id: '11111111-2222-3333-4444-555555555555',
    sha256: 'deadbeef',
    llm_profile: 'cloud-fast',
    verdict: 'major',
    extracted_fields: {},
    issues: [],
    latency_ms: 842,
    ...overrides,
  }
}

describe('AssessmentPanel', () => {
  it('renders the empty placeholder when no pipeline result is available', () => {
    render(<AssessmentPanel result={null} />)
    expect(screen.getByText(/Pipeline assessment is not available/i)).toBeInTheDocument()
  })

  it('renders the verdict pill with the correct accessible label and data attribute', () => {
    render(<AssessmentPanel result={makeResult({ verdict: 'major' })} />)
    const verdict = screen.getByRole('status', { name: /verdict: major issues/i })
    expect(verdict).toHaveAttribute('data-verdict', 'major')
  })

  it('shows the no-issues empty state when issues is empty', () => {
    render(<AssessmentPanel result={makeResult({ verdict: 'clean', issues: [] })} />)
    expect(screen.getByText(/No issues detected/i)).toBeInTheDocument()
    const verdict = screen.getByRole('status', { name: /verdict: clean/i })
    expect(verdict).toHaveAttribute('data-verdict', 'clean')
  })

  it('groups issues with major before minor', () => {
    const result = makeResult({
      verdict: 'major',
      issues: [
        makeIssue({
          kind: 'block_lot_format',
          severity: 'minor',
          field: '4A LOT NO',
          value: '123/45',
          message: 'Block/lot must be 4/3 digits',
        }),
        makeIssue({
          kind: 'missing_description',
          severity: 'major',
          field: '16 DESCRIPTION',
          message: 'Description fields are all empty',
        }),
      ],
    })

    render(<AssessmentPanel result={result} />)

    const sections = screen.getAllByRole('region')
    expect(sections[0]).toHaveAccessibleName(/major issues/i)
    expect(sections[1]).toHaveAccessibleName(/minor issues/i)

    expect(within(sections[0]).getByText('missing_description')).toBeInTheDocument()
    expect(within(sections[1]).getByText('block_lot_format')).toBeInTheDocument()
  })

  it('renders LLM issues with confidence and a Stage 6 aria label', () => {
    const result = makeResult({
      verdict: 'minor',
      issues: [
        makeIssue({
          kind: 'description_mismatch_bank_form_3_phrasing',
          severity: 'minor',
          field: '16 DESCRIPTION',
          value: 'tenant remodel',
          message: 'Description does not match Form 3 phrasing',
          source: 'llm',
          confidence: 0.83,
        }),
      ],
    })

    render(<AssessmentPanel result={result} />)

    expect(screen.getByLabelText(/llm judgment \(stage 6\)/i)).toBeInTheDocument()
    expect(screen.getByText(/· 83%/)).toBeInTheDocument()
    expect(screen.getByText(/Description does not match Form 3 phrasing/i)).toBeInTheDocument()
    expect(screen.getByText(/value: tenant remodel/i)).toBeInTheDocument()
  })

  it('renders rule issues with a Stage 5 aria label and no confidence percent', () => {
    const result = makeResult({
      verdict: 'major',
      issues: [
        makeIssue({
          kind: 'missing_description',
          source: 'rule',
          confidence: null,
        }),
      ],
    })

    render(<AssessmentPanel result={result} />)

    expect(screen.getByLabelText(/rule finding \(stage 5\)/i)).toBeInTheDocument()
    expect(screen.queryByText(/· \d+%/)).not.toBeInTheDocument()
  })

  it('shows a meta line summarising profile, latency and rule/llm split', () => {
    const result = makeResult({
      llm_profile: 'cloud-fast',
      latency_ms: 1234,
      issues: [
        makeIssue({ source: 'rule' }),
        makeIssue({ source: 'rule' }),
        makeIssue({ source: 'llm', confidence: 0.5 }),
      ],
    })

    render(<AssessmentPanel result={result} />)

    expect(screen.getByText('cloud-fast')).toBeInTheDocument()
    expect(screen.getByText(/1234 ms/)).toBeInTheDocument()
    expect(screen.getByText(/2 rule · 1 llm/)).toBeInTheDocument()
  })
})
