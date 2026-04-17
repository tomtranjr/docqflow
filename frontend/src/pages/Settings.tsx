import { useTheme } from '@/context/ThemeContext'

const THEME_OPTIONS = ['light', 'dark', 'system'] as const

export function Settings() {
  const { theme, setTheme } = useTheme()

  return (
    <div className="max-w-md">
      <h1 className="mb-6 text-xl font-bold text-[var(--color-text-primary)]">Settings</h1>
      <div className="rounded border border-[var(--color-border)] p-4">
        <h2 className="mb-3 text-sm font-semibold text-[var(--color-text-primary)]">Theme</h2>
        <div className="flex gap-2">
          {THEME_OPTIONS.map((t) => (
            <button
              key={t}
              onClick={() => setTheme(t)}
              className={`rounded border px-4 py-2 text-sm capitalize ${
                theme === t
                  ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white'
                  : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] hover:bg-[var(--color-surface-alt)]'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
