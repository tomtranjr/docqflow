// TODO(track-C): replace with real implementation that pushes/persists notifications.
// This stub exists so TopBar (Track B2) can import the API surface in isolation.
import { createContext, useContext, useMemo, type ReactNode } from 'react'

export interface NotificationItem {
  id: string
  kind: 'pass' | 'fail'
  classificationId: number
  filename: string
  message: string
  read: boolean
  createdAt: number
}

export interface NotificationInput {
  kind: 'pass' | 'fail'
  classificationId: number
  filename: string
  message: string
}

export interface NotificationsContextValue {
  notifications: NotificationItem[]
  unreadCount: number
  push: (input: NotificationInput) => void
  markAllRead: () => void
  clear: () => void
}

const NOOP_VALUE: NotificationsContextValue = {
  notifications: [],
  unreadCount: 0,
  push: () => {},
  markAllRead: () => {},
  clear: () => {},
}

const Ctx = createContext<NotificationsContextValue | null>(null)

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const value = useMemo(() => NOOP_VALUE, [])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useNotifications(): NotificationsContextValue {
  // TODO(track-C): tighten to require a provider once App.tsx wraps in NotificationsProvider.
  // For Track B2, we fall back to no-op defaults so TopBar renders even without a provider.
  return useContext(Ctx) ?? NOOP_VALUE
}
