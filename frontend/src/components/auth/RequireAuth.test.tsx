import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { RequireAuth } from './RequireAuth'
import { PreferencesProvider } from '@/context/PreferencesContext'

function setup(initialPath: string) {
  return render(
    <PreferencesProvider>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/login" element={<div>login page</div>} />
          <Route
            path="/app"
            element={
              <RequireAuth>
                <div>app content</div>
              </RequireAuth>
            }
          />
        </Routes>
      </MemoryRouter>
    </PreferencesProvider>,
  )
}

describe('RequireAuth', () => {
  beforeEach(() => localStorage.clear())

  it('redirects to /login when reviewer name is the sentinel default', () => {
    setup('/app')
    expect(screen.getByText('login page')).toBeInTheDocument()
    expect(screen.queryByText('app content')).not.toBeInTheDocument()
  })

  it('renders children when reviewer name is set', () => {
    localStorage.setItem('docqflow.prefs', JSON.stringify({ reviewerName: 'alex' }))
    setup('/app')
    expect(screen.getByText('app content')).toBeInTheDocument()
  })
})
