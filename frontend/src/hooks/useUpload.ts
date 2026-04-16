import { useCallback } from 'react'
import { useUploadContext } from '@/context/UploadContext'
import { classifyPDF } from '@/lib/api'
import { MAX_CONCURRENT_UPLOADS } from '@/lib/constants'

function makeId(file: File): string {
  return `${file.name}-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export function useUpload() {
  const { items, dispatch } = useUploadContext()

  const uploadFile = useCallback(
    async (id: string, file: File) => {
      dispatch({ type: 'SET_STATUS', id, status: 'uploading' })
      try {
        const result = await classifyPDF(file)
        dispatch({ type: 'SET_RESULT', id, result })
      } catch (err) {
        dispatch({
          type: 'SET_ERROR',
          id,
          error: err instanceof Error ? err.message : 'Upload failed',
        })
      }
    },
    [dispatch],
  )

  const addAndProcess = useCallback(
    async (files: File[]) => {
      const newItems = files.map((file) => ({ id: makeId(file), file }))
      dispatch({ type: 'ADD_FILES', items: newItems })

      const queue = [...newItems]

      const processNext = async (): Promise<void> => {
        const item = queue.shift()
        if (!item) return
        await uploadFile(item.id, item.file)
        return processNext()
      }

      const workers = Array.from(
        { length: Math.min(MAX_CONCURRENT_UPLOADS, queue.length) },
        () => processNext(),
      )
      await Promise.all(workers)
    },
    [dispatch, uploadFile],
  )

  const clear = useCallback(() => dispatch({ type: 'CLEAR' }), [dispatch])

  const retryFile = useCallback(
    (id: string) => {
      const item = items.find((i) => i.id === id)
      if (item) uploadFile(id, item.file)
    },
    [items, uploadFile],
  )

  return { items, addAndProcess, clear, retryFile }
}
