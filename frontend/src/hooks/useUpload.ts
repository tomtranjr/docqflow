import { useCallback, useRef } from 'react'
import { useUploadContext } from '@/context/UploadContext'
import { classifyPDF } from '@/lib/api'
import { MAX_CONCURRENT_UPLOADS } from '@/lib/constants'

function makeId(file: File): string {
  return `${file.name}-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

type QueueItem = { id: string; file: File }

export function useUpload() {
  const { items, dispatch } = useUploadContext()
  const queueRef = useRef<QueueItem[]>([])
  const activeRef = useRef(0)

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

  const drain = useCallback(async (): Promise<void> => {
    for (;;) {
      const item = queueRef.current.shift()
      if (!item) {
        activeRef.current = Math.max(0, activeRef.current - 1)
        return
      }
      await uploadFile(item.id, item.file)
    }
  }, [uploadFile])

  const enqueue = useCallback(
    (queueItems: QueueItem[]) => {
      queueRef.current.push(...queueItems)
      const slotsFree = MAX_CONCURRENT_UPLOADS - activeRef.current
      const toSpawn = Math.min(slotsFree, queueRef.current.length)
      for (let i = 0; i < toSpawn; i++) {
        activeRef.current += 1
        void drain()
      }
    },
    [drain],
  )

  const addAndProcess = useCallback(
    (files: File[]) => {
      const newItems = files.map((file) => ({ id: makeId(file), file }))
      dispatch({ type: 'ADD_FILES', items: newItems })
      enqueue(newItems)
    },
    [dispatch, enqueue],
  )

  const clear = useCallback(() => dispatch({ type: 'CLEAR' }), [dispatch])

  const retryFile = useCallback(
    (id: string) => {
      const item = items.find((i) => i.id === id)
      if (item) enqueue([{ id, file: item.file }])
    },
    [items, enqueue],
  )

  return { items, addAndProcess, clear, retryFile }
}
