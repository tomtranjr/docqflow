import { useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useUploadContext } from '@/context/UploadContext'
import { classifyPDF } from '@/lib/api'
import { MAX_CONCURRENT_UPLOADS } from '@/lib/constants'
import type { QueuedResult } from '@/lib/types'

type QueueItem = { id: string; file: File }

export function useUpload() {
  const { items, dispatch, setQueueResults } = useUploadContext()
  const navigate = useNavigate()
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
    async (files: File[]) => {
      if (files.length === 0) return

      if (files.length === 1) {
        const file = files[0]
        try {
          const result = await classifyPDF(file)
          navigate(`/review/${result.id}`)
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Upload failed'
          toast.error(`Upload failed: ${message}`)
        }
        return
      }

      const settled = await Promise.allSettled(files.map((file) => classifyPDF(file)))
      const queued: QueuedResult[] = []
      const failures: string[] = []
      settled.forEach((outcome, idx) => {
        if (outcome.status === 'fulfilled') {
          queued.push({ filename: files[idx].name, result: outcome.value })
        } else {
          failures.push(files[idx].name)
        }
      })
      if (failures.length > 0) {
        toast.error(
          `${failures.length} of ${files.length} uploads failed: ${failures.slice(0, 3).join(', ')}`,
        )
      }
      setQueueResults(queued)
      navigate('/queue')
    },
    [navigate, setQueueResults],
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
