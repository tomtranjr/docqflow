import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import type { HistoryEntry } from '@/lib/types'

const useHistoryMock = vi.fn()
vi.mock('@/hooks/useHistory', () => ({
  useHistory: () => useHistoryMock(),
}))

import { Submissions } from './Submissions'

function renderSubmissions() {
  const router = createMemoryRouter(
    [{ path: '/submissions', element: <Submissions /> }],
    { initialEntries: ['/submissions'] },
  )
  return render(<RouterProvider router={router} />)
}

const fakeEntries: HistoryEntry[] = [
  {
    id: 1,
    filename: 'permit-1.pdf',
    uploaded_at: new Date().toISOString(),
    label: 'permit-3-8',
    confidence: 0.92,
    probabilities: { 'permit-3-8': 0.92, 'not-permit-3-8': 0.08 },
    text_preview: null,
    file_size: null,
    pdf_sha256: null,
  },
  {
    id: 2,
    filename: 'permit-2.pdf',
    uploaded_at: new Date().toISOString(),
    label: 'not-permit-3-8',
    confidence: 0.4,
    probabilities: { 'permit-3-8': 0.4, 'not-permit-3-8': 0.6 },
    text_preview: null,
    file_size: null,
    pdf_sha256: null,
  },
]

describe('Submissions', () => {
  it('renders rows from useHistory', () => {
    useHistoryMock.mockReturnValue({
      entries: fakeEntries,
      total: 2,
      page: 1,
      setPage: vi.fn(),
      label: '',
      setLabel: vi.fn(),
      search: '',
      setSearch: vi.fn(),
      loading: false,
      error: null,
    })

    renderSubmissions()

    expect(screen.getByText('permit-1.pdf')).toBeInTheDocument()
    expect(screen.getByText('permit-2.pdf')).toBeInTheDocument()
    // The label appears once in the select option and once in the row badge.
    expect(screen.getAllByText('permit-3-8').length).toBeGreaterThanOrEqual(2)
    expect(screen.getAllByText('not-permit-3-8').length).toBeGreaterThanOrEqual(2)
  })
})
