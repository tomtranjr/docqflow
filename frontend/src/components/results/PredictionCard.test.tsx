import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PredictionCard } from './PredictionCard'

describe('PredictionCard', () => {
  it('renders filename, label, and high-confidence percentage', () => {
    render(
      <PredictionCard
        filename="permit_001.pdf"
        result={{
          label: 'permit-3-8',
          probabilities: { 'permit-3-8': 0.95, 'not-permit-3-8': 0.05 },
        }}
      />,
    )

    expect(screen.getByText('permit_001.pdf')).toBeInTheDocument()
    expect(screen.getByText('permit-3-8')).toBeInTheDocument()
    expect(screen.getByText('95%')).toBeInTheDocument()
  })

  it('renders medium confidence (50%) rounding to the max probability', () => {
    render(
      <PredictionCard
        filename="borderline.pdf"
        result={{
          label: 'permit-3-8',
          probabilities: { 'permit-3-8': 0.5, 'not-permit-3-8': 0.5 },
        }}
      />,
    )

    expect(screen.getByText('50%')).toBeInTheDocument()
  })

  it('renders low-confidence winner using the max probability', () => {
    render(
      <PredictionCard
        filename="uncertain.pdf"
        result={{
          label: 'not-permit-3-8',
          probabilities: { 'permit-3-8': 0.9, 'not-permit-3-8': 0.1 },
        }}
      />,
    )

    // the badge shows max(probabilities) regardless of which label won
    expect(screen.getByText('90%')).toBeInTheDocument()
    expect(screen.getByText('not-permit-3-8')).toBeInTheDocument()
  })

  it('truncates long filenames to 40 chars with an ellipsis', () => {
    const longName =
      'this_is_a_very_long_filename_that_exceeds_the_forty_char_limit.pdf'
    render(
      <PredictionCard
        filename={longName}
        result={{
          label: 'permit-3-8',
          probabilities: { 'permit-3-8': 0.88, 'not-permit-3-8': 0.12 },
        }}
      />,
    )

    expect(screen.getByText(longName.slice(0, 40) + '...')).toBeInTheDocument()
  })
})
