export type PredictionResponse = {
  id: number
  label: string
  probabilities: Record<string, number>
  pdf_sha256: string
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
  pdf_sha256: string | null
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

export type FieldName =
  | 'applicant_name'
  | 'address'
  | 'permit_type'
  | 'parcel_number'
  | 'project_address'
  | 'contractor_name'
  | 'license_number'
  | 'estimated_cost'
  | 'square_footage'

export type Department =
  | 'building'
  | 'electrical'
  | 'plumbing'
  | 'zoning'
  | 'other'

export interface ExtractedField {
  value: string | null
  source_text: string | null
}

export interface ExtractionResult {
  fields: Record<FieldName, ExtractedField>
  department: Department
  department_confidence: number
  model: string
  prompt_version: number
}

export type ExtractionState =
  | { kind: 'loading' }
  | { kind: 'ok'; result: ExtractionResult }
  | { kind: 'not_permit'; classificationId: string }
  | { kind: 'pdf_missing' }
  | { kind: 'unavailable'; retryAfterS?: number }
  | { kind: 'not_found' }
  | { kind: 'error'; message: string }
