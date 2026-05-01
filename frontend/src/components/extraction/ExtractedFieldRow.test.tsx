import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect } from 'vitest'
import { ExtractedFieldRow } from './ExtractedFieldRow'

describe('ExtractedFieldRow', () => {
  it('renders the value when present and reveals source_text on click', async () => {
    render(
      <ExtractedFieldRow
        name="applicant_name"
        field={{ value: 'John Doe', source_text: 'Applicant Name: John Doe' }}
      />,
    )
    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.queryByText(/Applicant Name: John Doe/)).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button'))
    expect(screen.getByText(/Applicant Name: John Doe/)).toBeInTheDocument()
  })

  it('renders MISSING badge when value is null', () => {
    render(
      <ExtractedFieldRow
        name="estimated_cost"
        field={{ value: null, source_text: null }}
      />,
    )
    expect(screen.getByText('MISSING')).toBeInTheDocument()
  })
})
