import { render, screen, act } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import { PreferencesProvider, usePreferences } from './PreferencesContext'

function Probe() {
  const { theme, showConfidence, setShowConfidence } = usePreferences()
  return (
    <>
      <span data-testid="theme">{theme}</span>
      <span data-testid="show">{String(showConfidence)}</span>
      <button onClick={() => setShowConfidence(true)}>show</button>
    </>
  )
}

beforeEach(() => localStorage.clear())

describe('PreferencesContext', () => {
  it('uses defaults when storage empty', () => {
    render(
      <PreferencesProvider>
        <Probe />
      </PreferencesProvider>,
    )
    expect(screen.getByTestId('theme').textContent).toBe('system')
    expect(screen.getByTestId('show').textContent).toBe('false')
  })

  it('persists changes to localStorage', () => {
    render(
      <PreferencesProvider>
        <Probe />
      </PreferencesProvider>,
    )
    act(() => screen.getByText('show').click())
    expect(JSON.parse(localStorage.getItem('docqflow.prefs')!).showConfidence).toBe(true)
  })
})
