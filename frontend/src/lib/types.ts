export type PredictionResponse = {
  id: number
  label: string
  probabilities: Record<string, number>
  pdf_sha256: string
}

export type QueuedResult = {
  filename: string
  result: PredictionResponse
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

export interface ExtractedFields {
  application_number: string | null
  date_filed: string | null
  project_address: string | null
  parcel_number: string | null
  estimated_cost: string | null
  stories: string | null
  dwelling_units: string | null
  proposed_use: string | null
  occupancy_class: string | null
  construction_type: string | null
  contractor_name: string | null
  contractor_address: string | null
  license_number: string | null
  owner_name: string | null
  description: string | null
}

export interface Completeness {
  passed: boolean
  missing: string[]
}

export interface ExtractedFieldsResponse {
  fields: ExtractedFields
  completeness: Completeness
}

// Pipeline (Stages 4-6) — mirrors src/pipeline/schemas.py.
export type Severity = 'minor' | 'major'
export type Verdict = 'clean' | 'minor' | 'major'
export type IssueSource = 'rule' | 'llm'

export type IssueKind =
  | 'missing_block_lot'
  | 'missing_description'
  | 'missing_street_number'
  | 'missing_form_checkbox'
  | 'block_lot_format'
  | 'license_digit_drop'
  | 'street_suffix_swap'
  | 'address_typo'
  | 'date_impossibility_swap'
  | 'address_block_lot_mismatch'
  | 'cost_scope_mismatch'
  | 'description_mismatch_bank_form_3_phrasing'

export type PipelineExtractedFields = Record<string, string | boolean | null>

export interface Issue {
  kind: IssueKind
  severity: Severity
  field: string
  value: string | null
  message: string
  source: IssueSource
  confidence: number | null
}

export interface PipelineResult {
  document_id: string
  sha256?: string | null
  llm_profile: string
  verdict: Verdict
  extracted_fields: PipelineExtractedFields
  issues: Issue[]
  latency_ms: number
}

export interface LLMProfileInfo {
  name: string
  provider: string
  model: string
  reachable: boolean
}
