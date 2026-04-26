import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import { TopBar } from './TopBar'
import { PreferencesProvider } from '@/context/PreferencesContext'
import { NotificationsProvider } from '@/context/NotificationsContext'

function renderTopBar() {
  return render(
    <PreferencesProvider>
      <NotificationsProvider>
        <MemoryRouter>
          <TopBar />
        </MemoryRouter>
      </NotificationsProvider>
    </PreferencesProvider>,
  )
}

describe('TopBar', () => {
  it('renders the DocQFlow logo image', () => {
    renderTopBar()
    expect(screen.getByAltText(/docqflow/i)).toBeInTheDocument()
  })

  it('uses the navy top-rail token as background and has a bottom border', () => {
    renderTopBar()
    const header = screen.getByRole('banner')
    expect(header.className).toContain('bg-[var(--color-topbar-bg)]')
    expect(header.className).toContain('border-b')
  })

  it('renders an enabled notifications bell button', () => {
    renderTopBar()
    expect(screen.getByRole('button', { name: /notifications/i })).toBeEnabled()
  })

  it('renders an enabled user-menu button', () => {
    renderTopBar()
    expect(screen.getByRole('button', { name: /open user menu/i })).toBeEnabled()
  })
})
