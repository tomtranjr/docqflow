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

  it('redirects to /login when not authenticated', () => {
    setup('/app')
    expect(screen.getByText('login page')).toBeInTheDocument()
    expect(screen.queryByText('app content')).not.toBeInTheDocument()
  })

  it('renders children when authenticated', () => {
    localStorage.setItem('docqflow.prefs', JSON.stringify({ isAuthenticated: true }))
    setup('/app')
    expect(screen.getByText('app content')).toBeInTheDocument()
  })

  it('redirects when reviewer name is set but isAuthenticated is false', () => {
    // Regression: the old gate inferred auth from reviewerName !== "Reviewer".
    // The new gate must ignore reviewerName entirely.
    localStorage.setItem(
      'docqflow.prefs',
      JSON.stringify({ reviewerName: 'alex', isAuthenticated: false }),
    )
    setup('/app')
    expect(screen.getByText('login page')).toBeInTheDocument()
  })
})
