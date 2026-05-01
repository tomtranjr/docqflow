import { useRef } from 'react'
import { useUpload } from '@/hooks/useUpload'
import { UploadIcon } from '@/components/brand/icons'

interface UploadButtonProps {
  variant?: 'accent' | 'ghost'
  label?: string
  size?: 'sm' | 'md'
}

// Hidden file input + button that triggers the existing useUpload pipeline.
// One PDF goes straight to /app/review/:id, multiple route to /app/queue.
export function UploadButton({ variant = 'accent', label = 'Upload PDF', size = 'sm' }: UploadButtonProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const { addAndProcess } = useUpload()

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (files.length > 0) void addAndProcess(files)
  }

  const base = variant === 'accent' ? 'btn btn-accent' : 'btn btn-ghost'
  const className = size === 'sm' ? `${base} btn-sm` : base

  return (
    <>
      <button
        type="button"
        className={className}
        onClick={() => inputRef.current?.click()}
      >
        <UploadIcon size={14} />
        {label}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        multiple
        onChange={onPick}
        style={{ display: 'none' }}
      />
    </>
  )
}
