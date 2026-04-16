export function SkeletonCard() {
  return (
    <div className="flex animate-pulse items-center gap-3 rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
      <div className="h-4 w-48 rounded bg-[var(--color-surface-alt)]" />
      <div className="ml-auto h-5 w-20 rounded bg-[var(--color-surface-alt)]" />
      <div className="h-4 w-12 rounded bg-[var(--color-surface-alt)]" />
    </div>
  )
}
