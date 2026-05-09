import { useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useUploadContext } from '@/context/UploadContext'
import { useNotifications } from '@/context/NotificationsContext'
import { classifyPDF, getClassificationFields, processPDF } from '@/lib/api'
import { buildFailNotification, buildPassNotification } from '@/lib/notifications'
import { MAX_CONCURRENT_UPLOADS } from '@/lib/constants'
import type { PredictionResponse, QueuedResult } from '@/lib/types'

type QueueItem = { id: string; file: File }

export function useUpload() {
  const { items, dispatch, setQueueResults } = useUploadContext()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { push: pushNotification } = useNotifications()
  const queueRef = useRef<QueueItem[]>([])
  const activeRef = useRef(0)

  const notifyFromCheck = useCallback(
    async (prediction: PredictionResponse, filename: string) => {
      if (prediction.label !== 'permit-3-8') return
      try {
        const data = await queryClient.fetchQuery({
          queryKey: ['classification', prediction.id, 'fields'],
          queryFn: () => getClassificationFields(prediction.id),
        })
        if (data.completeness.passed) {
          pushNotification(buildPassNotification(prediction.id, filename))
        } else {
          pushNotification(buildFailNotification(prediction.id, filename, data.completeness))
        }
      } catch {
        // Fields unavailable; do not push a misleading fail notification.
      }
    },
    [queryClient, pushNotification],
  )

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
          // Run classify (Stage 1-3, drives the routing label / department) and
          // process (Stages 4-6, persists real extracted_fields + verdict +
          // issues for Review.tsx to fetch by sha256) in parallel. processPDF
          // failures (e.g. 422 NotAnAcroForm for non-permits, missing OPENAI key)
          // must not block classify — Review.tsx falls back to the placeholder
          // when no pipeline_run exists for the document.
          const [classifyResult] = await Promise.all([
            classifyPDF(file),
            processPDF(file, 'cloud-fast').catch((err) => {
              console.warn('processPDF failed; review will use placeholder fields', err)
              return null
            }),
          ])
          await notifyFromCheck(classifyResult, file.name)
          navigate(`/app/review/${classifyResult.id}`)
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
      await Promise.all(queued.map((q) => notifyFromCheck(q.result, q.filename)))
      if (failures.length > 0) {
        toast.error(
          `${failures.length} of ${files.length} uploads failed: ${failures.slice(0, 3).join(', ')}`,
        )
      }
      setQueueResults(queued)
      navigate('/app/queue')
    },
    [navigate, setQueueResults, notifyFromCheck],
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
