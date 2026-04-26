import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, beforeEach } from 'vitest'
import { PreferencesProvider } from '@/context/PreferencesContext'
import { Settings } from './Settings'

beforeEach(() => localStorage.clear())

describe('Settings', () => {
  it('confidence toggle reflects preferences state and flips when clicked', async () => {
    render(
      <PreferencesProvider>
        <Settings />
      </PreferencesProvider>,
    )

    const toggle = screen.getByRole('switch', { name: /show confidence by default/i })
    expect(toggle).toHaveAttribute('aria-checked', 'false')

    await userEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-checked', 'true')
  })

  it('renders the theme toggle row', () => {
    render(
      <PreferencesProvider>
        <Settings />
      </PreferencesProvider>,
    )
    expect(screen.getByRole('button', { name: /^light$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^dark$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^system$/i })).toBeInTheDocument()
  })
})
