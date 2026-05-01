import { Logo } from './Logo'

interface WordmarkProps {
  size?: number
  onDark?: boolean
}

export function Wordmark({ size = 22, onDark = false }: WordmarkProps) {
  const navy = onDark ? '#FFFFFF' : '#0B2545'
  const blue = onDark ? '#7BA8FB' : '#1E63E8'
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <Logo size={size + 18} onDark={onDark} />
      <span
        style={{
          fontSize: size,
          fontWeight: 700,
          letterSpacing: '-0.01em',
          fontFamily: 'var(--font-display)',
          lineHeight: 1,
          color: navy,
        }}
      >
        DocQ<span style={{ color: blue }}>Flow</span>
      </span>
    </span>
  )
}
