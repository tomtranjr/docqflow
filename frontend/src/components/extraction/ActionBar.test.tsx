import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { ActionBar } from './ActionBar'

describe('ActionBar', () => {
  it('renders three disabled action buttons with tooltip', () => {
    render(<ActionBar />)
    const buttons = screen.getAllByRole('button')
    expect(buttons).toHaveLength(3)
    buttons.forEach((b) => {
      expect(b).toBeDisabled()
      expect(b).toHaveAttribute('title', 'Available in PR 4')
    })
    expect(screen.getByLabelText('Confirm & Approve')).toBeInTheDocument()
    expect(screen.getByLabelText('Edit / Correct')).toBeInTheDocument()
    expect(screen.getByLabelText('Request More Info')).toBeInTheDocument()
  })
})
