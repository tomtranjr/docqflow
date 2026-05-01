import type { ReactNode } from 'react'
import { CheckIcon, UploadIcon, WarnIcon } from '@/components/brand/icons'

type ActivityIcon = 'check' | 'warn' | 'upload'
type ActivityTone = 'ok' | 'warn' | 'info'

interface ActivityProps {
  icon: ActivityIcon
  tone: ActivityTone
  text: ReactNode
  time: string
}

const TONES: Record<ActivityTone, string> = {
  ok: 'var(--ok)',
  warn: 'var(--warn)',
  info: 'var(--blue-500)',
}

export function Activity({ icon, tone, text, time }: ActivityProps) {
  const Icon = icon === 'check' ? CheckIcon : icon === 'warn' ? WarnIcon : UploadIcon
  return (
    <li style={{ display: 'flex', gap: 10, fontSize: 12, color: 'var(--ink-2)' }}>
      <span style={{ color: TONES[tone], marginTop: 2, flexShrink: 0 }}>
        <Icon size={14} />
      </span>
      <span style={{ flex: 1 }}>{text}</span>
      <span style={{ color: 'var(--ink-4)', flexShrink: 0 }}>{time}</span>
    </li>
  )
}
