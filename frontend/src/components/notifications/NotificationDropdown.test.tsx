import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act, fireEvent, render, renderHook, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { NotificationsProvider, useNotifications } from '@/context/NotificationsContext'
import { NotificationDropdown } from './NotificationDropdown'

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <NotificationsProvider>{children}</NotificationsProvider>
)

describe('NotificationDropdown', () => {
  beforeEach(() => localStorage.clear())

  it('shows the empty state when there are no notifications', () => {
    render(
      <NotificationsProvider>
        <MemoryRouter>
          <NotificationDropdown onClose={() => {}} />
        </MemoryRouter>
      </NotificationsProvider>,
    )
    expect(screen.getByText(/no notifications yet/i)).toBeInTheDocument()
  })

  it('renders pass and fail items pushed via the hook', () => {
    const seeded = renderHook(() => useNotifications(), { wrapper })
    act(() => {
      seeded.result.current.push({
        kind: 'pass',
        classificationId: 1,
        filename: 'a.pdf',
        message: 'All present',
      })
      seeded.result.current.push({
        kind: 'fail',
        classificationId: 2,
        filename: 'b.pdf',
        message: 'Missing 3 fields',
      })
    })

    render(
      <NotificationsProvider>
        <MemoryRouter>
          <NotificationDropdown onClose={() => {}} />
        </MemoryRouter>
      </NotificationsProvider>,
    )

    expect(screen.getByText('a.pdf')).toBeInTheDocument()
    expect(screen.getByText('All present')).toBeInTheDocument()
    expect(screen.getByText('b.pdf')).toBeInTheDocument()
    expect(screen.getByText('Missing 3 fields')).toBeInTheDocument()
  })

  it('calls onClose on outside pointer-down', () => {
    const onClose = vi.fn()
    render(
      <NotificationsProvider>
        <MemoryRouter>
          <div data-testid="outside" />
          <NotificationDropdown onClose={onClose} />
        </MemoryRouter>
      </NotificationsProvider>,
    )
    fireEvent.pointerDown(screen.getByTestId('outside'))
    expect(onClose).toHaveBeenCalled()
  })
})
