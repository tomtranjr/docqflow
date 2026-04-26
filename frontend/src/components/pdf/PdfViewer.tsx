import { useState } from 'react'
import { Document, Page } from 'react-pdf'
import 'react-pdf/dist/Page/TextLayer.css'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import '@/lib/pdfjsWorker'
import { PdfToolbar } from './PdfToolbar'

interface PdfViewerProps {
  url: string
  onPageInfo?: (numPages: number) => void
}

export default function PdfViewer({ url, onPageInfo }: PdfViewerProps) {
  const [numPages, setNumPages] = useState<number>(0)
  const [page, setPage] = useState<number>(1)
  const [scale, setScale] = useState<number>(1)

  return (
    <div className="flex flex-col gap-3">
      <PdfToolbar
        page={page}
        numPages={numPages}
        onPrev={() => setPage((p) => Math.max(1, p - 1))}
        onNext={() => setPage((p) => Math.min(numPages || 1, p + 1))}
        onZoomIn={() => setScale((s) => Math.min(3, s + 0.25))}
        onZoomOut={() => setScale((s) => Math.max(0.5, s - 0.25))}
        downloadHref={url}
      />
      <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-elev1)] p-4">
        <Document
          file={url}
          onLoadSuccess={(d) => {
            setNumPages(d.numPages)
            onPageInfo?.(d.numPages)
          }}
        >
          <Page pageNumber={page} scale={scale} />
        </Document>
      </div>
    </div>
  )
}
