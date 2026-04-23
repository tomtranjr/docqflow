export type PredictionResponse = {
  label: string
  probabilities: Record<string, number>
}

export type UploadItem = {
  id: string
  file: File
  status: 'idle' | 'uploading' | 'done' | 'error'
  result?: PredictionResponse
  error?: string
}

export type HistoryEntry = {
  id: number
  filename: string
  uploaded_at: string
  label: string
  confidence: number
  probabilities: Record<string, number>
  text_preview: string | null
  file_size: number | null
}

export type HistoryResponse = {
  items: HistoryEntry[]
  total: number
  page: number
}

export type StatsResponse = {
  total: number
  label_counts: Record<string, number>
  recent_count_7d: number
}
