interface LogoProps {
  size?: number
  onDark?: boolean
}

// DocQFlow mark — two stacked, offset document tiles forming a "Q" silhouette
// with an embedded forward arrow (the "flow"). White-on-dark variant keeps
// the logo legible against the navy TopBar.
export function Logo({ size = 28, onDark = false }: LogoProps) {
  const navy = onDark ? '#FFFFFF' : '#0B2545'
  const blue = onDark ? 'rgba(255,255,255,0.85)' : '#1E63E8'
  const arrow = onDark ? '#0B2545' : '#FFFFFF'
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <rect x="6" y="8" width="40" height="40" rx="6" fill={blue} opacity={onDark ? 0.55 : 0.18} />
      <rect x="18" y="20" width="40" height="40" rx="6" fill={navy} />
      <path
        d="M28 40 H44 M38 33 L46 40 L38 47"
        stroke={arrow}
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <rect x="50" y="52" width="8" height="8" rx="2" fill={blue} />
    </svg>
  )
}
