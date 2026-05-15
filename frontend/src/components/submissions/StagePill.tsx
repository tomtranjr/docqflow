import type { StageKey } from '@/lib/permitData'

const LABELS: Record<StageKey, string> = {
  processing: 'Processing',
  ready: 'Ready',
  rejected: 'Rejected',
  complete: 'Complete',
}

const PILL_CLASS: Record<StageKey, string> = {
  processing: 'pill-info',
  ready: 'pill-warn',
  rejected: 'pill-danger',
  complete: 'pill-success',
}

interface StagePillProps {
  stage: StageKey
}

export function StagePill({ stage }: StagePillProps) {
  return (
    <span className={`pill ${PILL_CLASS[stage]} pill-dot`} style={{ height: 22 }}>
      {LABELS[stage]}
    </span>
  )
}
