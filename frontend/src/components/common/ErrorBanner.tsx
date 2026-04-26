import { AlertCircle } from 'lucide-react'

interface ErrorBannerProps {
  title: string
  description?: string
  onRetry?: () => void
}

export function ErrorBanner({ title, description, onRetry }: ErrorBannerProps) {
  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-[var(--radius-md)] border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/10 p-4"
    >
      <AlertCircle className="h-5 w-5 shrink-0 text-[var(--color-danger)]" />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="text-sm font-semibold text-[var(--color-danger)]">{title}</p>
        {description && (
          <p className="text-sm text-[var(--color-text-secondary)]">{description}</p>
        )}
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="shrink-0 rounded-[var(--radius-sm)] border border-[var(--color-danger)]/30 px-3 py-1 text-xs font-medium text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10"
        >
          Retry
        </button>
      )}
    </div>
  )
}
