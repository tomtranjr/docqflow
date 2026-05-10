import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CheckIcon,
  ClockIcon,
  DocIcon,
  DownloadIcon,
  EditIcon,
  FlagIcon,
  HashIcon,
  SparkleIcon,
  UserIcon,
  WarnIcon,
  ZoomInIcon,
  ZoomOutIcon,
} from '@/components/brand/icons'
import { ProcessStrip } from '@/components/layout/ProcessStrip'
import { AssessmentPanel } from '@/components/review/AssessmentPanel'
import { FieldsPanel } from '@/components/review/FieldsPanel'
import { TimelinePanel } from '@/components/review/TimelinePanel'
import { HistoryPanel } from '@/components/review/HistoryPanel'
import { PdfMockPreview } from '@/components/review/PdfMockPreview'
import { RailBtn } from '@/components/review/RailBtn'
import { usePreferences } from '@/context/PreferencesContext'
import { usePlaceholderExtraction } from '@/hooks/usePlaceholderExtraction'
import { classificationPdfUrl, getClassification, getDocument } from '@/lib/api'
import { permitDepartment, PERMITS, type Permit, type PermitField } from '@/lib/permitData'
import { fieldsFromPipeline } from '@/lib/pipelineFields'
import type {
  ExtractedField,
  ExtractionState,
  FieldName,
  HistoryEntry,
  PipelineResult,
} from '@/lib/types'

const PdfViewer = lazy(() => import('@/components/pdf/PdfViewer'))

type Tab = 'assessment' | 'fields' | 'timeline' | 'history'

function fieldsFromExtraction(state: ExtractionState): Record<string, PermitField> {
  if (state.kind !== 'ok') return {}
  const out: Record<string, PermitField> = {}
  for (const [k, v] of Object.entries(state.result.fields) as [FieldName, ExtractedField][]) {
    out[k] = { v: v.value, c: v.value ? 0.92 : 0 }
  }
  return out
}

function entryToPermit(entry: HistoryEntry, fallbackId: string): Permit {
  const dept = permitDepartment(entry.label)
  const ageDays = Math.max(0, Math.floor((Date.now() - new Date(entry.uploaded_at).getTime()) / 86_400_000))
  return {
    id: String(entry.id) || fallbackId,
    filename: entry.filename,
    applicant: entry.filename.replace(/\.pdf$/i, ''),
    address: '—',
    neighborhood: '—',
    parcel: '—',
    type: entry.label,
    department: dept,
    cost: 0,
    sqft: null,
    received: new Date(entry.uploaded_at).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }),
    daysOpen: ageDays,
    stage: 'review',
    confidence: entry.confidence,
    flags: entry.confidence < 0.7 ? ['low_confidence'] : [],
    pages: 1,
  }
}

export function Review() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const { showConfidence, setShowConfidence } = usePreferences()

  const numericId = id ? Number(id) : Number.NaN
  const isLive = Number.isFinite(numericId)
  const fallbackPermit = useMemo(() => PERMITS.find((p) => p.id === id) ?? PERMITS[0], [id])

  const [liveEntry, setLiveEntry] = useState<HistoryEntry | null>(null)
  // Tag the cached result with the sha it belongs to so consumers can gate on
  // sha equality during render — prevents the previous document's assessment
  // from leaking across context changes without a setState-in-effect cascade.
  const [pipelineState, setPipelineState] = useState<{ sha: string; result: PipelineResult } | null>(null)
  const pipelineResult: PipelineResult | null =
    pipelineState && pipelineState.sha === liveEntry?.pdf_sha256 ? pipelineState.result : null
  const [error, setError] = useState<string | null>(null)
  const [activeField, setActiveField] = useState<string | null>(null)
  // Null until the user picks a tab. We derive the effective tab below so
  // pipeline data can promote 'assessment' to default the moment it lands —
  // without a setState-in-effect cascade.
  const [manualTab, setManualTab] = useState<Tab | null>(null)
  const tab: Tab = manualTab ?? (pipelineResult ? 'assessment' : 'fields')
  const setTab = setManualTab
  const [zoom, setZoom] = useState(1)
  const [page, setPage] = useState(1)

  const extraction = usePlaceholderExtraction(id ?? '')

  useEffect(() => {
    if (!isLive) return
    let cancelled = false
    getClassification(numericId)
      .then((entry) => {
        if (!cancelled) setLiveEntry(entry)
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load classification')
      })
    return () => {
      cancelled = true
    }
  }, [isLive, numericId])

  // Fetch the real Stages 4-6 pipeline result keyed by the document's sha256
  // once the classification has loaded. Returns null on 404 (legacy entries
  // uploaded before the pipeline endpoint was wired into useUpload), in which
  // case we fall back to the synthetic placeholder so the UI doesn't break.
  useEffect(() => {
    const sha = liveEntry?.pdf_sha256
    if (!sha) return
    let cancelled = false
    getDocument(sha)
      .then((res) => {
        if (!cancelled && res) setPipelineState({ sha, result: res })
      })
      .catch(() => {
        // Network / 5xx — keep the placeholder fallback rather than show an error
        // banner; the classification view is still useful on its own.
      })
    return () => {
      cancelled = true
    }
  }, [liveEntry?.pdf_sha256])

  const permit = useMemo<Permit>(() => {
    if (isLive && liveEntry) return entryToPermit(liveEntry, id ?? '')
    return fallbackPermit
  }, [isLive, liveEntry, id, fallbackPermit])

  const fields = pipelineResult
    ? fieldsFromPipeline(pipelineResult.extracted_fields, liveEntry?.label)
    : isLive
      ? fieldsFromExtraction(extraction)
      : (permit.fields ?? {})
  const headerConfPct = Math.round(permit.confidence * 100)

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '56px 1fr',
        height: 'calc(100vh - 60px)',
        overflow: 'hidden',
      }}
    >
      {/* Left utility rail */}
      <aside
        style={{
          background: 'var(--surface-card)',
          borderRight: '1px solid var(--line)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '14px 0',
          gap: 4,
        }}
      >
        <RailBtn label="Back to queue" onClick={() => navigate('/app/submissions')}>
          <ChevronLeftIcon size={14} />
        </RailBtn>
        <div style={{ height: 12 }} />
        <RailBtn
          label="Pipeline assessment"
          active={tab === 'assessment'}
          onClick={() => setTab('assessment')}
        >
          <SparkleIcon size={14} />
        </RailBtn>
        <RailBtn label="Extracted fields" active={tab === 'fields'} onClick={() => setTab('fields')}>
          <DocIcon size={14} />
        </RailBtn>
        <RailBtn label="Timeline" active={tab === 'timeline'} onClick={() => setTab('timeline')}>
          <ClockIcon size={14} />
        </RailBtn>
        <RailBtn label="History" active={tab === 'history'} onClick={() => setTab('history')}>
          <HashIcon size={14} />
        </RailBtn>
        <div style={{ flex: 1 }} />
        <RailBtn label="Flag">
          <FlagIcon size={14} />
        </RailBtn>
        <RailBtn label="Reassign">
          <UserIcon size={14} />
        </RailBtn>
      </aside>

      {/* Main */}
      <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        {/* Header */}
        <div style={{ borderBottom: '1px solid var(--line)', background: 'var(--surface-card)' }}>
          <div style={{ padding: '14px 22px', display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: 'var(--ink-4)' }}>
                <button
                  type="button"
                  onClick={() => navigate('/app/submissions')}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-4)', padding: 0 }}
                >
                  Submissions
                </button>
                <span>›</span>
                <span className="mono">{permit.id}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 2, flexWrap: 'wrap' }}>
                <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0, letterSpacing: '-0.01em' }}>
                  {permit.applicant}
                </h1>
                <span className="pill pill-info" style={{ height: 22 }}>
                  {permit.department} · {headerConfPct}%
                </span>
                {permit.flags.length > 0 && (
                  <span className="pill pill-warn pill-dot" style={{ height: 22 }}>
                    {permit.flags.length} flag{permit.flags.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>
                {permit.address} · {permit.type} · received {permit.received}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, flexShrink: 0, alignItems: 'center' }}>
              <button type="button" className="btn btn-sm">
                <FlagIcon size={12} /> Request info
              </button>
              <button type="button" className="btn btn-sm">
                <EditIcon size={12} /> Edit
              </button>
              <button type="button" className="btn btn-sm btn-warn">
                <CheckIcon size={12} /> Confirm &amp; approve
              </button>
            </div>
          </div>
          <div style={{ padding: '0 22px 12px' }}>
            <ProcessStrip active={permit.stage} compact />
          </div>
        </div>

        {error && (
          <div
            style={{
              padding: '10px 22px',
              fontSize: 12,
              color: 'var(--warn)',
              background: 'var(--warn-bg)',
              borderBottom: '1px solid var(--line)',
            }}
            role="alert"
          >
            <WarnIcon size={12} /> {error} — showing demo data instead.
          </div>
        )}

        {/* Workspace */}
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 440px', gap: 0, overflow: 'hidden' }}>
          <div
            style={{
              background: 'var(--surface-sunken)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              borderRight: '1px solid var(--line)',
            }}
          >
            <div
              style={{
                padding: '10px 18px',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                borderBottom: '1px solid var(--line)',
                background: 'var(--surface-card)',
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 600 }}>{permit.filename}</span>
              <span className="pill" style={{ height: 20, fontSize: 10 }}>
                {permit.pages} page{permit.pages !== 1 ? 's' : ''}
              </span>
              <div style={{ flex: 1 }} />
              <button
                type="button"
                className="btn btn-sm btn-ghost"
                onClick={() => setPage(Math.max(1, page - 1))}
                aria-label="Previous page"
              >
                <ChevronLeftIcon size={12} />
              </button>
              <span className="mono tabular" style={{ fontSize: 12, color: 'var(--ink-3)' }}>
                {page} / {permit.pages}
              </span>
              <button
                type="button"
                className="btn btn-sm btn-ghost"
                onClick={() => setPage(Math.min(permit.pages, page + 1))}
                aria-label="Next page"
              >
                <ChevronRightIcon size={12} />
              </button>
              <div style={{ width: 1, height: 18, background: 'var(--line)', margin: '0 4px' }} />
              <button
                type="button"
                className="btn btn-sm btn-ghost"
                onClick={() => setZoom(Math.max(0.6, zoom - 0.1))}
                aria-label="Zoom out"
              >
                <ZoomOutIcon size={12} />
              </button>
              <span className="mono tabular" style={{ fontSize: 12, color: 'var(--ink-3)' }}>
                {Math.round(zoom * 100)}%
              </span>
              <button
                type="button"
                className="btn btn-sm btn-ghost"
                onClick={() => setZoom(Math.min(1.6, zoom + 0.1))}
                aria-label="Zoom in"
              >
                <ZoomInIcon size={12} />
              </button>
              <div style={{ width: 1, height: 18, background: 'var(--line)', margin: '0 4px' }} />
              <button type="button" className="btn btn-sm btn-ghost" aria-label="Download">
                <DownloadIcon size={12} />
              </button>
            </div>

            <div style={{ flex: 1, overflow: 'auto', padding: '24px', display: 'flex', justifyContent: 'center' }}>
              {isLive ? (
                <Suspense
                  fallback={
                    <div className="card" style={{ padding: 24, fontSize: 13, color: 'var(--ink-3)' }}>
                      Loading PDF…
                    </div>
                  }
                >
                  <PdfViewer url={classificationPdfUrl(numericId)} />
                </Suspense>
              ) : (
                <PdfMockPreview permit={permit} activeField={activeField} zoom={zoom} />
              )}
            </div>
          </div>

          <div
            style={{
              background: 'var(--surface-card)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              minWidth: 0,
            }}
          >
            {tab === 'assessment' && <AssessmentPanel result={pipelineResult} />}
            {tab === 'fields' && (
              <FieldsPanel
                permit={permit}
                fields={fields}
                activeField={activeField}
                setActiveField={setActiveField}
                showConfidence={showConfidence}
                onToggleConfidence={() => setShowConfidence(!showConfidence)}
              />
            )}
            {tab === 'timeline' && <TimelinePanel permit={permit} />}
            {tab === 'history' && <HistoryPanel permit={permit} />}
          </div>
        </div>
      </div>
    </div>
  )
}
