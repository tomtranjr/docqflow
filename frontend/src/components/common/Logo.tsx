interface LogoProps {
  size?: 'sm' | 'md' | 'lg'
  withSlogan?: boolean
  className?: string
}

const SIZE_CLASS: Record<NonNullable<LogoProps['size']>, string> = {
  sm: 'h-6',
  md: 'h-8',
  lg: 'h-12',
}

export function Logo({ size = 'md', withSlogan = false, className }: LogoProps) {
  const src = withSlogan ? '/docqflow-logo-with-slogan.svg' : '/docqflow-logo.svg'
  return (
    <img
      src={src}
      alt="DocQFlow"
      className={[SIZE_CLASS[size], 'w-auto', className].filter(Boolean).join(' ')}
    />
  )
}
