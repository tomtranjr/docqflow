import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Download } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PdfToolbarProps {
  page: number
  numPages: number
  onPrev: () => void
  onNext: () => void
  onZoomIn: () => void
  onZoomOut: () => void
  downloadHref: string
}

const BTN =
  'inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-elev2)] disabled:cursor-not-allowed disabled:opacity-40'

export function PdfToolbar({
  page,
  numPages,
  onPrev,
  onNext,
  onZoomIn,
  onZoomOut,
  downloadHref,
}: PdfToolbarProps) {
  const total = numPages || 1
  return (
    <div
      role="toolbar"
      aria-label="PDF toolbar"
      className="flex items-center justify-between rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-elev1)] px-3 py-2"
    >
      <div className="flex items-center gap-1">
        <button
          type="button"
          aria-label="Previous page"
          onClick={onPrev}
          disabled={page <= 1}
          className={BTN}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="px-2 text-xs font-medium text-[var(--color-text-secondary)]">
          {page} / {total}
        </span>
        <button
          type="button"
          aria-label="Next page"
          onClick={onNext}
          disabled={page >= total}
          className={BTN}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <div className="flex items-center gap-1">
        <button type="button" aria-label="Zoom out" onClick={onZoomOut} className={BTN}>
          <ZoomOut className="h-4 w-4" />
        </button>
        <button type="button" aria-label="Zoom in" onClick={onZoomIn} className={BTN}>
          <ZoomIn className="h-4 w-4" />
        </button>
        <a
          href={downloadHref}
          download
          aria-label="Download PDF"
          className={cn(BTN, 'no-underline')}
        >
          <Download className="h-4 w-4" />
        </a>
      </div>
    </div>
  )
}
