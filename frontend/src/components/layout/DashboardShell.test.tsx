import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { PreferencesProvider } from '@/context/PreferencesContext'
import { DashboardShell } from './DashboardShell'

function renderShell(initialPath = '/') {
  const router = createMemoryRouter(
    [
      {
        element: <DashboardShell />,
        children: [{ path: '/', element: <div data-testid="page">page</div> }],
      },
    ],
    { initialEntries: [initialPath] },
  )
  return render(
    <PreferencesProvider>
      <RouterProvider router={router} />
    </PreferencesProvider>,
  )
}

describe('DashboardShell', () => {
  it('renders the left rail and process flow', () => {
    renderShell()
    expect(screen.getByLabelText('DocQFlow features')).toBeInTheDocument()
    expect(screen.getByLabelText('Process flow')).toBeInTheDocument()
    expect(screen.getByTestId('page')).toBeInTheDocument()
  })
})
