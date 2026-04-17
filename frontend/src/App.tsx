import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { Toaster } from 'sonner'
import { ThemeProvider } from '@/context/ThemeContext'
import { UploadProvider } from '@/context/UploadContext'
import { Shell } from '@/components/layout/Shell'
import { ErrorBoundary } from '@/components/feedback/ErrorBoundary'
import { Classify } from '@/pages/Classify'
import { History } from '@/pages/History'
import { About } from '@/pages/About'
import { Settings } from '@/pages/Settings'

const router = createBrowserRouter([
  {
    element: <Shell />,
    errorElement: <ErrorBoundary />,
    children: [
      { path: '/', element: <Classify /> },
      { path: '/history', element: <History /> },
      { path: '/about', element: <About /> },
      { path: '/settings', element: <Settings /> },
    ],
  },
])

export default function App() {
  return (
    <ThemeProvider>
      <UploadProvider>
        <RouterProvider router={router} />
        <Toaster position="bottom-right" richColors />
      </UploadProvider>
    </ThemeProvider>
  )
}
