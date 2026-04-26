import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { Toaster } from 'sonner'
import { PreferencesProvider } from '@/context/PreferencesContext'
import { UploadProvider } from '@/context/UploadContext'
import { DashboardShell } from '@/components/layout/DashboardShell'
import { WorkspaceShell } from '@/components/layout/WorkspaceShell'
import { ErrorBoundary } from '@/components/feedback/ErrorBoundary'
import { Dashboard } from '@/pages/Dashboard'
import { Review } from '@/pages/Review'
import { Queue } from '@/pages/Queue'
import { Submissions } from '@/pages/Submissions'
import { Reports } from '@/pages/Reports'
import { Settings } from '@/pages/Settings'
import { About } from '@/pages/About'

const router = createBrowserRouter([
  {
    element: <DashboardShell />,
    errorElement: <ErrorBoundary />,
    children: [{ path: '/', element: <Dashboard /> }],
  },
  {
    element: <WorkspaceShell />,
    errorElement: <ErrorBoundary />,
    children: [
      { path: '/review/:id', element: <Review /> },
      { path: '/queue', element: <Queue /> },
      { path: '/submissions', element: <Submissions /> },
      { path: '/reports', element: <Reports /> },
      { path: '/settings', element: <Settings /> },
      { path: '/about', element: <About /> },
    ],
  },
])

export default function App() {
  return (
    <PreferencesProvider>
      <UploadProvider>
        <RouterProvider router={router} />
        <Toaster position="bottom-right" richColors />
      </UploadProvider>
    </PreferencesProvider>
  )
}
