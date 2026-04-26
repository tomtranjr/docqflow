import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { PreferencesProvider } from '@/context/PreferencesContext'
import { UploadProvider } from '@/context/UploadContext'
import { Dashboard } from './Dashboard'

function renderDashboard() {
  const router = createMemoryRouter(
    [{ path: '/', element: <Dashboard /> }],
    { initialEntries: ['/'] },
  )
  return render(
    <PreferencesProvider>
      <UploadProvider>
        <RouterProvider router={router} />
      </UploadProvider>
    </PreferencesProvider>,
  )
}

describe('Dashboard', () => {
  it('renders the drop zone as a button affordance', () => {
    renderDashboard()
    expect(screen.getByText(/drop pdfs here or click to browse/i)).toBeInTheDocument()
    expect(screen.getByRole('button')).toBeInTheDocument()
  })
})
