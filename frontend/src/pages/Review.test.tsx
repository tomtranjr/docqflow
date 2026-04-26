import { render, screen, waitFor, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { PreferencesProvider } from '@/context/PreferencesContext'
import type { HistoryEntry } from '@/lib/types'

const getClassificationMock = vi.fn()
vi.mock('@/lib/api', () => ({
  getClassification: (id: number) => getClassificationMock(id),
  classificationPdfUrl: (id: number) => `/api/classifications/${id}/pdf`,
}))

vi.mock('@/components/pdf/PdfViewer', () => ({
  default: ({ url }: { url: string }) => <div data-testid="pdf-viewer">{url}</div>,
}))

vi.mock('react-pdf/dist/Page/TextLayer.css', () => ({}))
vi.mock('react-pdf/dist/Page/AnnotationLayer.css', () => ({}))
vi.mock('@/lib/pdfjsWorker', () => ({}))

import { Review } from './Review'

function renderReview(id = '42') {
  const router = createMemoryRouter(
    [{ path: '/review/:id', element: <Review /> }],
    { initialEntries: [`/review/${id}`] },
  )
  return render(
    <PreferencesProvider>
      <RouterProvider router={router} />
    </PreferencesProvider>,
  )
}

const fakeEntry: HistoryEntry = {
  id: 42,
  filename: 'permit-42.pdf',
  uploaded_at: '2026-04-25T12:00:00Z',
  label: 'permit-3-8',
  confidence: 0.92,
  probabilities: { 'permit-3-8': 0.92, 'not-permit-3-8': 0.08 },
  text_preview: null,
  file_size: null,
  pdf_sha256: null,
}

describe('Review', () => {
  beforeEach(() => {
    getClassificationMock.mockReset()
    localStorage.clear()
  })

  it('renders skeletons then placeholder field rows after the extraction timer fires', async () => {
    getClassificationMock.mockResolvedValueOnce(fakeEntry)
    vi.useFakeTimers({ shouldAdvanceTime: true })

    try {
      renderReview('42')
      await waitFor(() => expect(getClassificationMock).toHaveBeenCalledWith(42))
      expect(screen.getAllByLabelText('Loading field').length).toBeGreaterThan(0)

      act(() => {
        vi.advanceTimersByTime(700)
      })

      await waitFor(() => expect(screen.getByText(/john doe/i)).toBeInTheDocument())
      expect(screen.getByText('permit-42.pdf')).toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })
})
