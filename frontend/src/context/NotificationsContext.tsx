import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

export interface Notification {
  id: string
  kind: 'pass' | 'fail'
  classificationId: number
  filename: string
  message: string
  createdAt: string
  read: boolean
}

export interface NotificationsContextValue {
  notifications: Notification[]
  unreadCount: number
  push: (input: Omit<Notification, 'id' | 'createdAt' | 'read'>) => void
  markAllRead: () => void
  clear: () => void
}

const STORAGE_KEY = 'docqflow.notifications'
const MAX_HISTORY = 50

const NotificationsContext = createContext<NotificationsContextValue | null>(null)

const NOOP_VALUE: NotificationsContextValue = {
  notifications: [],
  unreadCount: 0,
  push: () => undefined,
  markAllRead: () => undefined,
  clear: () => undefined,
}

function loadFromStorage(): Notification[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? (parsed as Notification[]) : []
  } catch {
    return []
  }
}

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>(() => loadFromStorage())

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications))
  }, [notifications])

  const push = useCallback<NotificationsContextValue['push']>((input) => {
    const next: Notification = {
      ...input,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      read: false,
    }
    setNotifications((prev) => [next, ...prev].slice(0, MAX_HISTORY))
  }, [])

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => (n.read ? n : { ...n, read: true })))
  }, [])

  const clear = useCallback(() => setNotifications([]), [])

  const value = useMemo<NotificationsContextValue>(
    () => ({
      notifications,
      unreadCount: notifications.filter((n) => !n.read).length,
      push,
      markAllRead,
      clear,
    }),
    [notifications, push, markAllRead, clear],
  )

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useNotifications(): NotificationsContextValue {
  // Falls back to no-op when no provider is mounted so shell-only unit tests
  // (DashboardShell, WorkspaceShell) keep working without a wrapping provider.
  return useContext(NotificationsContext) ?? NOOP_VALUE
}
