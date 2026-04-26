import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { ExtractAnywayBanner } from './ExtractAnywayBanner'

describe('ExtractAnywayBanner', () => {
  it('invokes the callback when the action is clicked', async () => {
    const onExtractAnyway = vi.fn()
    render(<ExtractAnywayBanner onExtractAnyway={onExtractAnyway} />)
    expect(
      screen.getByText(/Classifier says this isn't a permit\. Run extraction anyway\?/),
    ).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /extract anyway/i }))
    expect(onExtractAnyway).toHaveBeenCalledTimes(1)
  })
})
