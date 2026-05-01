import { Outlet, useLocation } from 'react-router-dom'
import { TopBar } from './TopBar'
import { Footer } from './Footer'

// One shell for every /app/* route. The Review page hides the footer because
// it owns the full viewport (PDF + side panel run edge to edge).
export function AppShell() {
  const { pathname } = useLocation()
  const isReview = pathname.startsWith('/app/review/')
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <TopBar />
      <main style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <Outlet />
      </main>
      {!isReview && <Footer />}
    </div>
  )
}
