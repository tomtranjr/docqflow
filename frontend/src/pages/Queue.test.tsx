import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { useEffect, type ReactNode } from 'react'
import { PreferencesProvider } from '@/context/PreferencesContext'
import { UploadProvider, useUploadContext } from '@/context/UploadContext'
import type { QueuedResult } from '@/lib/types'

vi.mock('@/components/pdf/PdfThumbnail', () => ({
  default: ({ url }: { url: string }) => <div data-testid="pdf-thumbnail">{url}</div>,
}))

vi.mock('react-pdf/dist/Page/TextLayer.css', () => ({}))
vi.mock('react-pdf/dist/Page/AnnotationLayer.css', () => ({}))
vi.mock('@/lib/pdfjsWorker', () => ({}))

import { Queue } from './Queue'

function Seeder({ results, children }: { results: QueuedResult[]; children: ReactNode }) {
  const { setQueueResults } = useUploadContext()
  useEffect(() => {
    setQueueResults(results)
  }, [results, setQueueResults])
  return <>{children}</>
}

function renderQueue(results: QueuedResult[]) {
  const router = createMemoryRouter(
    [{ path: '/queue', element: <Queue /> }],
    { initialEntries: ['/queue'] },
  )
  return render(
    <PreferencesProvider>
      <UploadProvider>
        <Seeder results={results}>
          <RouterProvider router={router} />
        </Seeder>
      </UploadProvider>
    </PreferencesProvider>,
  )
}

describe('Queue', () => {
  it('shows the empty state when there are no queue results', () => {
    renderQueue([])
    expect(screen.getByText(/no documents in the queue/i)).toBeInTheDocument()
  })

  it('renders one thumbnail per queued result', async () => {
    renderQueue([
      {
        filename: 'permit-1.pdf',
        result: {
          id: 1,
          label: 'permit-3-8',
          probabilities: { 'permit-3-8': 0.9, 'not-permit-3-8': 0.1 },
          pdf_sha256: 'a',
        },
      },
      {
        filename: 'permit-2.pdf',
        result: {
          id: 2,
          label: 'not-permit-3-8',
          probabilities: { 'permit-3-8': 0.2, 'not-permit-3-8': 0.8 },
          pdf_sha256: 'b',
        },
      },
    ])

    expect(await screen.findByText('permit-1.pdf')).toBeInTheDocument()
    expect(screen.getByText('permit-2.pdf')).toBeInTheDocument()
  })
})
