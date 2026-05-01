import { Eye, EyeOff } from 'lucide-react'
import { usePreferences } from '@/context/PreferencesContext'
import { cn } from '@/lib/utils'

export function ConfidenceToggle() {
  const { showConfidence, setShowConfidence } = usePreferences()
  const Icon = showConfidence ? Eye : EyeOff
  return (
    <button
      type="button"
      onClick={() => setShowConfidence(!showConfidence)}
      aria-pressed={showConfidence}
      aria-label="Show confidence"
      className={cn(
        'inline-flex items-center gap-2 rounded-[var(--radius-sm)] border px-3 py-1.5 text-xs font-medium transition-colors',
        'border-[var(--color-border)] bg-[var(--color-surface-elev1)] text-[var(--color-text-secondary)]',
        'hover:bg-[var(--color-surface-elev2)]',
        showConfidence && 'border-[var(--color-brand-accent)] text-[var(--color-brand-accent)]',
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {showConfidence ? 'Confidence: on' : 'Confidence: off'}
    </button>
  )
}
