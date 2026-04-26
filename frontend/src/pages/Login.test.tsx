import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, beforeEach } from 'vitest'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { PreferencesProvider } from '@/context/PreferencesContext'
import { Login } from './Login'

function setup() {
  return render(
    <PreferencesProvider>
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/app" element={<div>app shell</div>} />
        </Routes>
      </MemoryRouter>
    </PreferencesProvider>,
  )
}

beforeEach(() => localStorage.clear())

describe('Login', () => {
  it('renders email + password inputs and a Sign in button', () => {
    setup()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })

  it('renders the DocQFlow logo with slogan', () => {
    setup()
    expect(screen.getByAltText(/docqflow/i)).toBeInTheDocument()
  })

  it('navigates to /app and stores reviewer name on valid submit', async () => {
    const user = userEvent.setup()
    setup()
    await user.type(screen.getByLabelText(/email/i), 'alex@example.com')
    await user.type(screen.getByLabelText(/password/i), 'whatever')
    await user.click(screen.getByRole('button', { name: /sign in/i }))
    expect(screen.getByText('app shell')).toBeInTheDocument()
    expect(JSON.parse(localStorage.getItem('docqflow.prefs')!).reviewerName).toBe('alex')
  })

  it('does not navigate when submitted with empty fields', () => {
    setup()
    fireEvent.submit(screen.getByRole('button', { name: /sign in/i }).closest('form')!)
    expect(screen.queryByText('app shell')).not.toBeInTheDocument()
  })
})
