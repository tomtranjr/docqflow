import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { PreferencesProvider } from '@/context/PreferencesContext'
import { NotificationsProvider } from '@/context/NotificationsContext'
import { UploadProvider } from '@/context/UploadContext'
import { Dashboard } from './Dashboard'

function renderDashboard() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const router = createMemoryRouter(
    [{ path: '/', element: <Dashboard /> }],
    { initialEntries: ['/'] },
  )
  return render(
    <QueryClientProvider client={queryClient}>
      <PreferencesProvider>
        <NotificationsProvider>
          <UploadProvider>
            <RouterProvider router={router} />
          </UploadProvider>
        </NotificationsProvider>
      </PreferencesProvider>
    </QueryClientProvider>,
  )
}

describe('Dashboard', () => {
  it('renders the drop zone as a button affordance', () => {
    renderDashboard()
    expect(screen.getByText(/drop pdfs here or click to browse/i)).toBeInTheDocument()
    expect(screen.getByRole('button')).toBeInTheDocument()
  })
})
