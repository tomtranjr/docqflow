import { CheckCircle2, Edit3, MessageCircleQuestion } from 'lucide-react'
import { cn } from '@/lib/utils'

const TOOLTIP = 'Available in PR 4'

interface ActionButtonProps {
  variant: 'primary' | 'secondary' | 'outline'
  icon: typeof CheckCircle2
  label: string
}

function ActionButton({ variant, icon: Icon, label }: ActionButtonProps) {
  return (
    <button
      type="button"
      disabled
      title={TOOLTIP}
      aria-label={label}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-[var(--radius-sm)] px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60',
        variant === 'primary' &&
          'bg-[var(--color-success)] text-white hover:opacity-90',
        variant === 'secondary' &&
          'bg-[var(--color-info)] text-white hover:opacity-90',
        variant === 'outline' &&
          'border border-[var(--color-border-strong)] bg-[var(--color-surface-elev1)] text-[var(--color-text-primary)]',
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  )
}

export function ActionBar() {
  return (
    <div className="flex flex-wrap items-center gap-3" role="group" aria-label="Review actions">
      <ActionButton variant="primary" icon={CheckCircle2} label="Confirm & Approve" />
      <ActionButton variant="secondary" icon={Edit3} label="Edit / Correct" />
      <ActionButton variant="outline" icon={MessageCircleQuestion} label="Request More Info" />
    </div>
  )
}
