import { usePreferences, useShowConfidence } from '@/context/PreferencesContext'
import { cn } from '@/lib/utils'

const THEME_OPTIONS = ['light', 'dark', 'system'] as const

export function Settings() {
  const { theme, setTheme, setShowConfidence } = usePreferences()
  const showConfidence = useShowConfidence()

  return (
    <div className="flex max-w-md flex-col gap-4">
      <h1 className="text-xl font-bold text-[var(--color-text-primary)]">Settings</h1>

      <section className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-elev1)] p-4 shadow-[var(--shadow-card)]">
        <h2 className="mb-3 text-sm font-semibold text-[var(--color-text-primary)]">Theme</h2>
        <div className="flex gap-2">
          {THEME_OPTIONS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTheme(t)}
              className={cn(
                'rounded-[var(--radius-sm)] border px-4 py-2 text-sm capitalize',
                theme === t
                  ? 'border-[var(--color-brand-accent)] bg-[var(--color-brand-accent)] text-white'
                  : 'border-[var(--color-border)] bg-[var(--color-surface-elev1)] text-[var(--color-text-primary)] hover:bg-[var(--color-surface-elev2)]',
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-elev1)] p-4 shadow-[var(--shadow-card)]">
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">
              Show confidence by default
            </h2>
            <p className="text-xs text-[var(--color-text-secondary)]">
              Display confidence percentages on extracted fields and department badges.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={showConfidence}
            aria-label="Show confidence by default"
            onClick={() => setShowConfidence(!showConfidence)}
            className={cn(
              'relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors',
              showConfidence
                ? 'bg-[var(--color-brand-accent)]'
                : 'bg-[var(--color-surface-elev2)]',
            )}
          >
            <span
              className={cn(
                'inline-block h-5 w-5 transform rounded-full bg-white transition-transform',
                showConfidence ? 'translate-x-5' : 'translate-x-0.5',
              )}
            />
          </button>
        </div>
      </section>
    </div>
  )
}
