import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

const STEPS = ['Upload', 'Extract', 'Validate', 'Classify', 'Review', 'Complete']

interface ProcessFlowStripProps {
  activeStep?: number
}

export function ProcessFlowStrip({ activeStep }: ProcessFlowStripProps) {
  return (
    <div
      role="list"
      aria-label="Process flow"
      className="flex items-center justify-center gap-2 border-t border-[var(--color-border)] bg-[var(--color-surface-elev1)] px-6 py-3"
    >
      {STEPS.map((step, index) => {
        const stepNum = index + 1
        const isActive = activeStep === stepNum
        const isPast = activeStep !== undefined && stepNum < activeStep
        return (
          <div key={step} className="flex items-center gap-2" role="listitem">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold',
                  isActive && 'bg-[var(--color-brand-accent)] text-white',
                  isPast && 'bg-[var(--color-success)] text-white',
                  !isActive && !isPast &&
                    'bg-[var(--color-surface-elev2)] text-[var(--color-text-muted)]',
                )}
              >
                {stepNum}
              </span>
              <span
                className={cn(
                  'text-xs font-medium',
                  isActive
                    ? 'text-[var(--color-text-primary)]'
                    : 'text-[var(--color-text-muted)]',
                )}
              >
                {step}
              </span>
            </div>
            {index < STEPS.length - 1 && (
              <ChevronRight
                className="h-3 w-3 text-[var(--color-text-muted)]"
                aria-hidden="true"
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
