import { useRef } from 'react'
import { useUpload } from '@/hooks/useUpload'
import { UploadIcon } from '@/components/brand/icons'

interface UploadButtonProps {
  variant?: 'accent' | 'ghost'
  label?: string
}

// Hidden file input + button that triggers the existing useUpload pipeline.
// One PDF goes straight to /app/review/:id, multiple route to /app/queue.
export function UploadButton({ variant = 'accent', label = 'Upload PDF' }: UploadButtonProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const { addAndProcess } = useUpload()

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (files.length > 0) void addAndProcess(files)
  }

  return (
    <>
      <button
        type="button"
        className={variant === 'accent' ? 'btn btn-accent btn-sm' : 'btn btn-ghost btn-sm'}
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
