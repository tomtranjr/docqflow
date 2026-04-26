export function ExtractedFieldRowSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading field"
      className="flex items-center gap-3 border-b border-[var(--color-border)] px-3 py-2.5 last:border-b-0"
    >
      <div className="h-4 w-4 shrink-0 animate-pulse rounded bg-[var(--color-surface-elev2)]" />
      <div className="h-3 w-32 shrink-0 animate-pulse rounded bg-[var(--color-surface-elev2)]" />
      <div className="h-4 flex-1 animate-pulse rounded bg-[var(--color-surface-elev2)]" />
    </div>
  )
}
