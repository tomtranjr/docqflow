import { describe, it, expect, beforeEach } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { NotificationsProvider, useNotifications } from './NotificationsContext'

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <NotificationsProvider>{children}</NotificationsProvider>
)

describe('NotificationsContext', () => {
  beforeEach(() => localStorage.clear())

  it('starts empty with zero unread', () => {
    const { result } = renderHook(() => useNotifications(), { wrapper })
    expect(result.current.notifications).toEqual([])
    expect(result.current.unreadCount).toBe(0)
  })

  it('pushes a pass notification and bumps unread', () => {
    const { result } = renderHook(() => useNotifications(), { wrapper })
    act(() => {
      result.current.push({
        kind: 'pass',
        classificationId: 1,
        filename: 'permit_X.pdf',
        message: 'All required fields present.',
      })
    })
    expect(result.current.notifications).toHaveLength(1)
    expect(result.current.unreadCount).toBe(1)
    expect(result.current.notifications[0]).toMatchObject({
      kind: 'pass',
      classificationId: 1,
      read: false,
    })
  })

  it('markAllRead drops unread to zero', () => {
    const { result } = renderHook(() => useNotifications(), { wrapper })
    act(() => {
      result.current.push({ kind: 'fail', classificationId: 2, filename: 'x.pdf', message: 'm' })
    })
    expect(result.current.unreadCount).toBe(1)
    act(() => result.current.markAllRead())
    expect(result.current.unreadCount).toBe(0)
  })

  it('clear empties notifications', () => {
    const { result } = renderHook(() => useNotifications(), { wrapper })
    act(() => {
      result.current.push({ kind: 'pass', classificationId: 3, filename: 'a.pdf', message: 'm' })
      result.current.clear()
    })
    expect(result.current.notifications).toEqual([])
  })

  it('persists notifications across remounts via localStorage', () => {
    const first = renderHook(() => useNotifications(), { wrapper })
    act(() => {
      first.result.current.push({
        kind: 'pass',
        classificationId: 99,
        filename: 'p.pdf',
        message: 'm',
      })
    })
    first.unmount()
    const second = renderHook(() => useNotifications(), { wrapper })
    expect(second.result.current.notifications).toHaveLength(1)
    expect(second.result.current.notifications[0].classificationId).toBe(99)
  })
})
