import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, beforeEach } from 'vitest'
import { PreferencesProvider } from '@/context/PreferencesContext'
import { ConfidenceToggle } from './ConfidenceToggle'

beforeEach(() => localStorage.clear())

describe('ConfidenceToggle', () => {
  it('toggles showConfidence preference on click', async () => {
    render(
      <PreferencesProvider>
        <ConfidenceToggle />
      </PreferencesProvider>,
    )
    const btn = screen.getByRole('button', { name: /show confidence/i })
    expect(btn).toHaveAttribute('aria-pressed', 'false')

    await userEvent.click(btn)
    expect(btn).toHaveAttribute('aria-pressed', 'true')
    expect(JSON.parse(localStorage.getItem('docqflow.prefs')!).showConfidence).toBe(true)
  })
})
