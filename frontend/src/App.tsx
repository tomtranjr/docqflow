import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { PreferencesProvider } from '@/context/PreferencesContext'
import { NotificationsProvider } from '@/context/NotificationsContext'
import { UploadProvider } from '@/context/UploadContext'
import { AppShell } from '@/components/layout/AppShell'
import { ErrorBoundary } from '@/components/feedback/ErrorBoundary'
import { RequireAuth } from '@/components/auth/RequireAuth'
import { Landing } from '@/pages/Landing'
import { Login } from '@/pages/Login'
import { Inbox } from '@/pages/Inbox'
import { Review } from '@/pages/Review'
import { Settings } from '@/pages/Settings'
import { Notifications } from '@/pages/Notifications'
import { About } from '@/pages/About'
import { Process } from '@/pages/Process'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
})

// /app/dashboard, /app/submissions, /app/queue, /app/reports were folded into
// the new single Inbox page. We keep redirects so old bookmarks and any links
// still pointing at those paths land somewhere useful instead of a 404.
const router = createBrowserRouter([
  { path: '/', element: <Landing /> },
  { path: '/login', element: <Login /> },
  {
    path: '/app',
    element: (
      <RequireAuth>
        <AppShell />
      </RequireAuth>
    ),
    errorElement: <ErrorBoundary />,
    children: [
      { index: true, element: <Inbox /> },
      { path: 'review/:id', element: <Review /> },
      { path: 'settings', element: <Settings /> },
      { path: 'notifications', element: <Notifications /> },
      { path: 'about', element: <About /> },
      { path: 'process', element: <Process /> },
      { path: 'dashboard', element: <Navigate to="/app" replace /> },
      { path: 'submissions', element: <Navigate to="/app" replace /> },
      { path: 'queue', element: <Navigate to="/app" replace /> },
      { path: 'reports', element: <Navigate to="/app" replace /> },
    ],
  },
])

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <PreferencesProvider>
        <NotificationsProvider>
          <UploadProvider>
            <RouterProvider router={router} />
            <Toaster position="bottom-right" richColors />
          </UploadProvider>
        </NotificationsProvider>
      </PreferencesProvider>
    </QueryClientProvider>
  )
}
