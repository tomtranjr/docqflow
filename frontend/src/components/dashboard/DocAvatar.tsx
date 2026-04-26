import { BoltIcon, BuildingIcon, DocIcon, DropIcon, MapIcon } from '@/components/brand/icons'
import type { DepartmentKey } from '@/lib/permitData'

interface DocAvatarProps {
  dept: DepartmentKey
}

const COLORS: Record<DepartmentKey, string> = {
  Building: 'var(--blue-500)',
  Electrical: '#D97706',
  Plumbing: '#0EA5E9',
  Zoning: '#7C3AED',
  Other: 'var(--ink-4)',
}

export function DocAvatar({ dept }: DocAvatarProps) {
  const Icon =
    dept === 'Building'
      ? BuildingIcon
      : dept === 'Electrical'
        ? BoltIcon
        : dept === 'Plumbing'
          ? DropIcon
          : dept === 'Zoning'
            ? MapIcon
            : DocIcon
  return (
    <div
      style={{
        width: 36,
        height: 36,
        borderRadius: 8,
        background: 'var(--surface-sunken)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: COLORS[dept],
        flexShrink: 0,
      }}
    >
      <Icon size={16} />
    </div>
  )
}
