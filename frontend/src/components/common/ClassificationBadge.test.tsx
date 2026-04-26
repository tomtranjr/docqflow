import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { ClassificationBadge } from './ClassificationBadge'

describe('ClassificationBadge', () => {
  it('renders the label text', () => {
    render(<ClassificationBadge label="permit-3-8" />)
    expect(screen.getByText('permit-3-8')).toBeInTheDocument()
  })

  it('uses different styling for not-permit-3-8', () => {
    const { rerender } = render(<ClassificationBadge label="permit-3-8" />)
    const permitBadge = screen.getByText('permit-3-8')
    const permitClasses = permitBadge.className

    rerender(<ClassificationBadge label="not-permit-3-8" />)
    const notPermitBadge = screen.getByText('not-permit-3-8')
    expect(notPermitBadge.className).not.toBe(permitClasses)
  })
})
