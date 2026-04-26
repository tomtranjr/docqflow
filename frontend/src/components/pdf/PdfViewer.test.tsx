import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import type { ReactNode } from 'react'

interface DocumentProps {
  children: ReactNode
  onLoadSuccess?: (d: { numPages: number }) => void
}

vi.mock('react-pdf', () => ({
  Document: ({ children, onLoadSuccess }: DocumentProps) => {
    onLoadSuccess?.({ numPages: 3 })
    return <div data-testid="pdf-document">{children}</div>
  },
  Page: ({ pageNumber, scale }: { pageNumber: number; scale: number }) => (
    <div data-testid="pdf-page" data-page={pageNumber} data-scale={scale}>
      page {pageNumber}
    </div>
  ),
  pdfjs: { GlobalWorkerOptions: {} },
}))

vi.mock('react-pdf/dist/Page/TextLayer.css', () => ({}))
vi.mock('react-pdf/dist/Page/AnnotationLayer.css', () => ({}))
vi.mock('@/lib/pdfjsWorker', () => ({}))

import PdfViewer from './PdfViewer'

describe('PdfViewer', () => {
  it('shows the page indicator and advances on next click', async () => {
    render(<PdfViewer url="/api/pdf/1" />)
    expect(screen.getByText('1 / 3')).toBeInTheDocument()
    expect(screen.getByTestId('pdf-page')).toHaveAttribute('data-page', '1')

    await userEvent.click(screen.getByLabelText('Next page'))
    expect(screen.getByText('2 / 3')).toBeInTheDocument()
    expect(screen.getByTestId('pdf-page')).toHaveAttribute('data-page', '2')
  })

  it('zooms in and out via toolbar', async () => {
    render(<PdfViewer url="/api/pdf/1" />)
    const initial = screen.getByTestId('pdf-page').getAttribute('data-scale')
    expect(initial).toBe('1')

    await userEvent.click(screen.getByLabelText('Zoom in'))
    expect(screen.getByTestId('pdf-page')).toHaveAttribute('data-scale', '1.25')

    await userEvent.click(screen.getByLabelText('Zoom out'))
    expect(screen.getByTestId('pdf-page')).toHaveAttribute('data-scale', '1')
  })
})
