import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { ErrorBanner } from './ErrorBanner'

describe('ErrorBanner', () => {
  it('renders title and description', () => {
    render(<ErrorBanner title="Upload failed" description="Network error" />)
    expect(screen.getByText('Upload failed')).toBeInTheDocument()
    expect(screen.getByText('Network error')).toBeInTheDocument()
  })

  it('does not render retry button when onRetry is omitted', () => {
    render(<ErrorBanner title="Failed" />)
    expect(screen.queryByRole('button', { name: /retry/i })).not.toBeInTheDocument()
  })

  it('invokes onRetry when retry button is clicked', async () => {
    const onRetry = vi.fn()
    render(<ErrorBanner title="Failed" onRetry={onRetry} />)
    await userEvent.click(screen.getByRole('button', { name: /retry/i }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })
})
