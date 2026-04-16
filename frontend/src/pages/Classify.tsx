import { DropZone } from '@/components/upload/DropZone'
import { FileList } from '@/components/upload/FileList'
import { BatchProgress } from '@/components/upload/BatchProgress'
import { useUpload } from '@/hooks/useUpload'

export function Classify() {
  const { items, addAndProcess, clear, retryFile } = useUpload()

  const hasItems = items.length > 0
  const processing = items.some((i) => i.status === 'uploading')

  const downloadCSV = () => {
    const done = items.filter((i) => i.result)
    if (done.length === 0) return
    const headers = ['Filename', 'Label', 'Confidence', ...Object.keys(done[0].result!.probabilities)]
    const rows = done.map((i) => [
      i.file.name,
      i.result!.label,
      String(Math.max(...Object.values(i.result!.probabilities))),
      ...Object.values(i.result!.probabilities).map(String),
    ])
    const csv = [headers, ...rows].map((r) => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `docqflow-results-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
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
