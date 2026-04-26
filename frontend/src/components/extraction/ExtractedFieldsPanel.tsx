import type { ExtractionState } from '@/lib/types'
import { ConfidenceToggle } from '@/components/common/ConfidenceToggle'
import { ExtractedFieldRow } from './ExtractedFieldRow'
import { ExtractedFieldRowSkeleton } from './ExtractedFieldRowSkeleton'
import { FIELD_ORDER } from './fieldMeta'

interface ExtractedFieldsPanelProps {
  state: ExtractionState
}

export function ExtractedFieldsPanel({ state }: ExtractedFieldsPanelProps) {
  return (
    <section className="flex flex-col rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-elev1)] shadow-[var(--shadow-card)]">
      <header className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">
          Extracted Fields
        </h2>
        <ConfidenceToggle />
      </header>
      <div className="flex flex-col">
        {state.kind === 'loading' &&
          FIELD_ORDER.map((name) => <ExtractedFieldRowSkeleton key={name} />)}
        {state.kind === 'ok' &&
          FIELD_ORDER.map((name) => (
            <ExtractedFieldRow key={name} name={name} field={state.result.fields[name]} />
          ))}
        {state.kind !== 'ok' && state.kind !== 'loading' && (
          <p className="px-4 py-3 text-sm text-[var(--color-text-secondary)]">
            Extraction unavailable.
          </p>
        )}
      </div>
    </section>
  )
}
