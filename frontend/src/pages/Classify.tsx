import { DropZone } from '@/components/upload/DropZone'
import { FileList } from '@/components/upload/FileList'
import { BatchProgress } from '@/components/upload/BatchProgress'
import { useUpload } from '@/hooks/useUpload'

export function Classify() {
  const { items, addAndProcess, clear, retryFile } = useUpload()

  const hasItems = items.length > 0
  const processing = items.some((i) => i.status === 'uploading')

  const downloadCSV = () => {
    const done = items.filter((i) => i.status === 'done' && i.result)
    if (done.length === 0) return

    const escapeCSV = (val: string | number) => {
      const str = String(val)
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`
      }
      return str
    }

    const headers = ['Filename', 'Label', 'Confidence', ...Object.keys(done[0].result!.probabilities)]
    const rows = done.map((i) => {
      const probs = Object.values(i.result!.probabilities)
      const confidence = probs.length > 0 ? Math.max(...probs) : 0
      return [
        escapeCSV(i.file.name),
        escapeCSV(i.result!.label),
        escapeCSV(confidence),
        ...probs.map((p) => escapeCSV(p)),
      ]
    })
    const csv = [headers.map(escapeCSV), ...rows].map((r) => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `docqflow-results-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <h1 className="mb-6 text-xl font-bold text-[var(--color-text-primary)]">
        Classify Documents
      </h1>
      <DropZone onFiles={addAndProcess} disabled={processing} />
      {hasItems && (
        <div className="mt-6">
          <BatchProgress items={items} onClear={clear} onDownloadCSV={downloadCSV} />
        </div>
      )}
      <FileList items={items} onRetry={retryFile} />
    </div>
  )
}
