import { Document, Page } from 'react-pdf'
import 'react-pdf/dist/Page/TextLayer.css'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import '@/lib/pdfjsWorker'

interface PdfThumbnailProps {
  url: string
  scale?: number
}

export default function PdfThumbnail({ url, scale = 0.3 }: PdfThumbnailProps) {
  return (
    <Document file={url}>
      <Page pageNumber={1} scale={scale} renderTextLayer={false} renderAnnotationLayer={false} />
    </Document>
  )
}
