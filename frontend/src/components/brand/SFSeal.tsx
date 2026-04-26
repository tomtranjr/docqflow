interface SFSealProps {
  size?: number
  color?: string
}

export function SFSeal({ size = 18, color = 'currentColor' }: SFSealProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 2 L20 5 V12 C20 17 16.5 20.5 12 22 C7.5 20.5 4 17 4 12 V5 Z"
        stroke={color}
        strokeWidth="1.4"
        fill="none"
        opacity="0.55"
      />
      <path
        d="M9 11 L12 8 L15 11 M12 8 V15"
        stroke={color}
        strokeWidth="1.2"
        strokeLinecap="round"
        fill="none"
        opacity="0.55"
      />
      <circle cx="12" cy="13" r="0.9" fill={color} opacity="0.55" />
    </svg>
  )
}
