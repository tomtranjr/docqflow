import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { DropZone } from '@/components/upload/DropZone'
import { PipelineResultPanel } from '@/components/results/PipelineResultPanel'
import { getLLMProfiles, processPDF } from '@/lib/api'
import type { LLMProfileInfo, PipelineResult } from '@/lib/types'

const ACTIVE_PROFILE = 'cloud-fast'

type ProcessState =
  | { kind: 'idle' }
  | { kind: 'processing'; filename: string }
  | { kind: 'success'; filename: string; result: PipelineResult }
  | { kind: 'error'; filename: string; message: string }

interface ModelIndicatorProps {
  profileName: string
  info: LLMProfileInfo | undefined
  loading: boolean
  error: boolean
}

function ModelIndicator({ profileName, info, loading, error }: ModelIndicatorProps) {
  let body: React.ReactNode
  if (loading) {
    body = <span className="text-[var(--color-text-secondary)]">checking…</span>
  } else if (error || !info) {
    body = <span className="text-rose-700">profile unavailable</span>
  } else {
    body = (
      <>
        <span className="font-mono">
          {info.provider}/{info.model}
        </span>
        <span
          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs ${
            info.reachable
              ? 'border-emerald-300 bg-emerald-100 text-emerald-900'
              : 'border-amber-300 bg-amber-100 text-amber-900'
          }`}
          aria-label={info.reachable ? 'profile reachable' : 'profile not reachable'}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
          {info.reachable ? 'reachable' : 'not reachable'}
        </span>
      </>
    )
  }

  return (
    <div
      role="group"
      aria-label="Active LLM profile"
      className="inline-flex items-center gap-3 rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm"
    >
      <span className="text-xs uppercase tracking-wide text-[var(--color-text-secondary)]">
        Profile
      </span>
      <span className="font-semibold">{profileName}</span>
      {body}
    </div>
  )
}

function ProcessStatus({ state }: { state: ProcessState }) {
  if (state.kind === 'idle' || state.kind === 'success') return null
  if (state.kind === 'processing') {
    return (
      <p className="mt-4 text-sm text-[var(--color-text-secondary)]" role="status">
        Processing <span className="font-mono">{state.filename}</span>…
      </p>
    )
  }
  return (
    <p
      role="alert"
      className="mt-4 rounded border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-900"
    >
      Failed to process <span className="font-mono">{state.filename}</span>: {state.message}
    </p>
  )
}

export function Process() {
  const [state, setState] = useState<ProcessState>({ kind: 'idle' })
  const profilesQuery = useQuery({
    queryKey: ['llm', 'profiles'],
    queryFn: getLLMProfiles,
    staleTime: 60_000,
  })
  const active = profilesQuery.data?.find((p) => p.name === ACTIVE_PROFILE)

  async function handleFiles(files: File[]) {
    const file = files[0]
    if (!file) return
    setState({ kind: 'processing', filename: file.name })
    try {
      const result = await processPDF(file, ACTIVE_PROFILE)
      setState({ kind: 'success', filename: file.name, result })
    } catch (err) {
      setState({
        kind: 'error',
        filename: file.name,
        message: err instanceof Error ? err.message : 'Processing failed',
      })
    }
  }

  const isProcessing = state.kind === 'processing'
  // Allow uploads while the profile query is still loading (optimistic) or
  // after it confirms a reachable profile. Block when the query has resolved
  // but the active profile is missing/unreachable, so the DropZone state
  // matches the ModelIndicator's "profile unavailable" / "not reachable" UI.
  const profileReady = profilesQuery.isSuccess && active?.reachable === true
  const profileBlocksUpload = !profilesQuery.isLoading && !profileReady

  return (
    <div style={{ padding: 'var(--pad-page)' }}>
      <div style={{ marginBottom: 20 }}>
        <div className="label-eyebrow" style={{ marginBottom: 4 }}>
          Pipeline
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, letterSpacing: '-0.01em' }}>
          Process a permit PDF
        </h1>
        <p style={{ fontSize: 13, color: 'var(--ink-3)', margin: '4px 0 0' }}>
          Run Stages 4–6 (extract → validate → reason) and inspect the result.
        </p>
      </div>

      <ModelIndicator
        profileName={ACTIVE_PROFILE}
        info={active}
        loading={profilesQuery.isLoading}
        error={profilesQuery.isError}
      />

      <div className="mt-4">
        <DropZone onFiles={handleFiles} disabled={isProcessing || profileBlocksUpload} />
      </div>

      <ProcessStatus state={state} />

      {state.kind === 'success' && (
        <div className="mt-6">
          <PipelineResultPanel result={state.result} />
        </div>
      )}
    </div>
  )
}
