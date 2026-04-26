import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ExtractedField, FieldName } from '@/lib/types'
import { FIELD_META } from './fieldMeta'

interface ExtractedFieldRowProps {
  name: FieldName
  field: ExtractedField
}

export function ExtractedFieldRow({ name, field }: ExtractedFieldRowProps) {
  const [open, setOpen] = useState(false)
  const meta = FIELD_META[name]
  const Icon = meta.icon
  const isMissing = field.value === null
  const canExpand = !!field.source_text

  return (
    <div className="border-b border-[var(--color-border)] last:border-b-0">
      <button
        type="button"
        onClick={() => canExpand && setOpen((v) => !v)}
        disabled={!canExpand}
        aria-expanded={canExpand ? open : undefined}
        className={cn(
          'flex w-full items-center gap-3 px-3 py-2.5 text-left',
          canExpand && 'hover:bg-[var(--color-surface-elev2)]',
        )}
      >
        <Icon className="h-4 w-4 shrink-0 text-[var(--color-text-muted)]" />
        <span className="w-40 shrink-0 text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
          {meta.label}
        </span>
        <span className="min-w-0 flex-1 truncate text-sm text-[var(--color-text-primary)]">
          {isMissing ? (
            <span className="inline-flex items-center rounded-[var(--radius-sm)] bg-[var(--color-danger)]/10 px-2 py-0.5 text-xs font-semibold text-[var(--color-danger)]">
              MISSING
            </span>
          ) : (
            field.value
          )}
        </span>
        {canExpand &&
          (open ? (
            <ChevronDown className="h-4 w-4 shrink-0 text-[var(--color-text-muted)]" />
          ) : (
            <ChevronRight className="h-4 w-4 shrink-0 text-[var(--color-text-muted)]" />
          ))}
      </button>
      {open && field.source_text && (
        <div className="border-t border-[var(--color-border)] bg-[var(--color-surface-base)] px-3 py-2">
          <p className="text-xs italic text-[var(--color-text-secondary)]">
            "{field.source_text}"
          </p>
        </div>
      )}
    </div>
  )
}
