import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { PreferencesProvider } from '@/context/PreferencesContext'
import { WorkspaceShell } from './WorkspaceShell'

function renderShell() {
  const router = createMemoryRouter(
    [
      {
        element: <WorkspaceShell />,
        children: [{ path: '/', element: <div data-testid="page">page</div> }],
      },
    ],
    { initialEntries: ['/'] },
  )
  return render(
    <PreferencesProvider>
      <RouterProvider router={router} />
    </PreferencesProvider>,
  )
}

describe('WorkspaceShell', () => {
  it('omits the marketing rail and shows the back nav', () => {
    renderShell()
    expect(screen.queryByLabelText('DocQFlow features')).not.toBeInTheDocument()
    expect(screen.getByText(/back to dashboard/i)).toBeInTheDocument()
    expect(screen.getByTestId('page')).toBeInTheDocument()
  })
})
