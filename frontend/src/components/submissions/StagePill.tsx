import type { StageKey } from '@/lib/permitData'

const LABELS: Record<StageKey, string> = {
  extract: 'Extract',
  validate: 'Validate',
  classify: 'Classify',
  review: 'Review',
  complete: 'Complete',
}

interface StagePillProps {
  stage: StageKey
}

export function StagePill({ stage }: StagePillProps) {
  const isComplete = stage === 'complete'
  return (
    <span className={`pill ${isComplete ? 'pill-success' : 'pill-info'} pill-dot`} style={{ height: 22 }}>
      {LABELS[stage]}
    </span>
  )
}
