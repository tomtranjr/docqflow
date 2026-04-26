import { AlertTriangle } from 'lucide-react'

interface ExtractAnywayBannerProps {
  onExtractAnyway?: () => void
}

export function ExtractAnywayBanner({ onExtractAnyway }: ExtractAnywayBannerProps) {
  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-[var(--radius-md)] border border-[var(--color-warning)]/30 bg-[var(--color-warning)]/10 p-4"
    >
      <AlertTriangle className="h-5 w-5 shrink-0 text-[var(--color-warning)]" />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="text-sm font-semibold text-[var(--color-warning)]">
          Classifier says this isn't a permit
        </p>
        <p className="text-sm text-[var(--color-text-secondary)]">
          Classifier says this isn't a permit. Run extraction anyway?
        </p>
      </div>
      <button
        type="button"
        onClick={onExtractAnyway}
        className="shrink-0 rounded-[var(--radius-sm)] border border-[var(--color-warning)]/30 px-3 py-1 text-xs font-medium text-[var(--color-warning)] hover:bg-[var(--color-warning)]/10"
      >
        Extract anyway
      </button>
    </div>
  )
}
