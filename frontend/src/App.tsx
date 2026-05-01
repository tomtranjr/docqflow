import { createBrowserRouter, RouterProvider } from 'react-router-dom'
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
import { Dashboard } from '@/pages/Dashboard'
import { Review } from '@/pages/Review'
import { Queue } from '@/pages/Queue'
import { Submissions } from '@/pages/Submissions'
import { Reports } from '@/pages/Reports'
import { Settings } from '@/pages/Settings'
import { Notifications } from '@/pages/Notifications'
import { About } from '@/pages/About'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
})

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
      { index: true, element: <Dashboard /> },
      { path: 'review/:id', element: <Review /> },
      { path: 'queue', element: <Queue /> },
      { path: 'submissions', element: <Submissions /> },
      { path: 'reports', element: <Reports /> },
      { path: 'settings', element: <Settings /> },
      { path: 'notifications', element: <Notifications /> },
      { path: 'about', element: <About /> },
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
