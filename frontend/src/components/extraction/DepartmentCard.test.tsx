import { render, screen, act } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import { PreferencesProvider, usePreferences } from '@/context/PreferencesContext'
import { DepartmentCard } from './DepartmentCard'

function ToggleConfidence() {
  const { setShowConfidence } = usePreferences()
  return <button onClick={() => setShowConfidence(true)}>show</button>
}

beforeEach(() => localStorage.clear())

describe('DepartmentCard', () => {
  it('shows the department label and hides confidence by default', () => {
    render(
      <PreferencesProvider>
        <DepartmentCard department="building" confidence={0.96} />
      </PreferencesProvider>,
    )
    expect(screen.getByText('Building Department')).toBeInTheDocument()
    expect(screen.queryByText('96% confidence')).not.toBeInTheDocument()
  })

  it('shows confidence when showConfidence is enabled', () => {
    render(
      <PreferencesProvider>
        <ToggleConfidence />
        <DepartmentCard department="building" confidence={0.96} />
      </PreferencesProvider>,
    )
    act(() => screen.getByText('show').click())
    expect(screen.getByText('96% confidence')).toBeInTheDocument()
  })
})
