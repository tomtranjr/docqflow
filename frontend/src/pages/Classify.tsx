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
      let str = String(val)
      // Neutralize formula injection by prefixing leading special characters
      if (str.length > 0 && ['=', '+', '-', '@'].includes(str[0])) {
        str = "'" + str
      }
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`
      }
      return str
    }

    // Collect all unique class keys in deterministic order
    const orderedKeysSet = new Set<string>()
    done.forEach((i) => {
      Object.keys(i.result!.probabilities).forEach((key) => orderedKeysSet.add(key))
    })
    const orderedKeys = Array.from(orderedKeysSet).sort()

    const headers = ['Filename', 'Label', 'Confidence', ...orderedKeys]
    const rows = done.map((i) => {
      const probValues = orderedKeys.map((key) => i.result!.probabilities[key] ?? 0)
      const confidence = probValues.length > 0 ? Math.max(...probValues) : 0
      return [
        escapeCSV(i.file.name),
        escapeCSV(i.result!.label),
        escapeCSV(confidence),
        ...probValues.map((p) => escapeCSV(p)),
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