import { CheckCircle2, Minus, AlertTriangle } from 'lucide-react'
import { CONFIDENCE_THRESHOLDS } from '@/lib/constants'
import { cn } from '@/lib/utils'

interface ConfidenceBadgeProps {
  confidence: number
}

export function ConfidenceBadge({ confidence }: ConfidenceBadgeProps) {
  const pct = Math.round(confidence * 100)

  let Icon: typeof CheckCircle2
  let colorClass: string
  if (confidence >= CONFIDENCE_THRESHOLDS.HIGH) {
    Icon = CheckCircle2
    colorClass = 'text-[var(--color-success)]'
  } else if (confidence >= CONFIDENCE_THRESHOLDS.MEDIUM) {
    Icon = Minus
    colorClass = 'text-[var(--color-warning)]'
  } else {
    Icon = AlertTriangle
    colorClass = 'text-[var(--color-error)]'
  }

  return (
    <span className={cn('inline-flex items-center gap-1 text-sm font-medium', colorClass)}>
      <Icon className="h-3.5 w-3.5" />
      {pct}%
    </span>
  )
}
