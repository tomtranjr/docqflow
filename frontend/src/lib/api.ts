import type { PredictionResponse, HistoryResponse, StatsResponse, HistoryEntry } from './types'

const BASE = '/api'

async function fetchJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init)
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(body.detail || `HTTP ${res.status}`)
  }
  return res.json()
}

export async function classifyPDF(file: File): Promise<PredictionResponse> {
  const form = new FormData()
  form.append('file', file)
  return fetchJSON<PredictionResponse>(`${BASE}/predict`, { method: 'POST', body: form })
}

export async function getHistory(
  params: { page?: number; limit?: number; label?: string; search?: string } = {},
): Promise<HistoryResponse> {
  const qs = new URLSearchParams()
  if (params.page) qs.set('page', String(params.page))
  if (params.limit) qs.set('limit', String(params.limit))
  if (params.label) qs.set('label', params.label)
  if (params.search) qs.set('search', params.search)
  return fetchJSON<HistoryResponse>(`${BASE}/history?${qs}`)
}

export async function getHistoryEntry(id: number): Promise<HistoryEntry> {
  return fetchJSON<HistoryEntry>(`${BASE}/history/${id}`)
}

export async function getClassification(id: number): Promise<HistoryEntry> {
  return fetchJSON<HistoryEntry>(`${BASE}/classifications/${id}`)
}

export function classificationPdfUrl(id: number): string {
  return `${BASE}/classifications/${id}/pdf`
}

export async function getStats(): Promise<StatsResponse> {
  return fetchJSON<StatsResponse>(`${BASE}/stats`)
}

export async function checkHealth(): Promise<{ status: string; model_loaded: boolean }> {
  return fetchJSON(`${BASE}/health`)
}
