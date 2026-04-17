import { useCallback, useState, useRef } from 'react'
import { Upload } from 'lucide-react'
import { MAX_FILE_SIZE, ACCEPTED_TYPES } from '@/lib/constants'
import { cn } from '@/lib/utils'

interface DropZoneProps {
  onFiles: (files: File[]) => void
  disabled?: boolean
}

export function DropZone({ onFiles, disabled }: DropZoneProps) {
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const validate = useCallback((files: FileList | File[]): File[] => {
    const valid: File[] = []
    setError(null)
    for (const file of Array.from(files)) {
      if (!file.name.toLowerCase().endsWith('.pdf') && !ACCEPTED_TYPES.includes(file.type)) {
        setError('Only PDF files accepted')
        continue
      }
      if (file.size > MAX_FILE_SIZE) {
        setError(`File exceeds 20MB limit: ${file.name}`)
        continue
      }
      valid.push(file)
    }
    return valid
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      if (disabled) return
      const valid = validate(e.dataTransfer.files)
      if (valid.length) onFiles(valid)
    },
    [disabled, validate, onFiles],
  )

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        const valid = validate(e.target.files)
        if (valid.length) onFiles(valid)
      }
      e.target.value = ''
    },
    [validate, onFiles],
  )

  return (
    <div>
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled}
        onDragOver={(e) => {
          e.preventDefault()
          if (!disabled) setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={(e) => {
          if (disabled) return
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            inputRef.current?.click()
          }
        }}
        className={cn(
          'flex cursor-pointer flex-col items-center gap-3 rounded border-2 border-dashed px-8 py-12 transition-all duration-150',
          'border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-primary)]',
          dragOver && 'border-solid border-[var(--color-primary)] bg-[var(--color-primary)]/5',
          disabled && 'cursor-not-allowed opacity-50',
        )}
      >
        <Upload className="h-10 w-10 text-[var(--color-text-secondary)]" />
        <div className="text-center">
          <p className="text-sm font-semibold text-[var(--color-text-primary)]">
            Drop PDFs here or click to browse
          </p>
          <p className="mt-1 text-xs text-[var(--color-text-secondary)]">PDF files up to 20MB each</p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,application/pdf"
          multiple
          onChange={handleChange}
          className="hidden"
        />
      </div>
      {error && <p className="mt-2 text-xs text-[var(--color-error)]">{error}</p>}
    </div>
  )
}
