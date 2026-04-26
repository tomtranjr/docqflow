import { DropZone } from '@/components/upload/DropZone'
import { useUpload } from '@/hooks/useUpload'

export function Dashboard() {
  const { addAndProcess } = useUpload()

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 py-8">
      <div className="flex flex-col gap-2 text-center">
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
          Upload permit documents
        </h1>
        <p className="text-sm text-[var(--color-text-secondary)]">
          Drop one PDF to jump straight to review. Drop multiple to batch them in the queue.
        </p>
      </div>
      <DropZone onFiles={addAndProcess} />
    </div>
  )
}
