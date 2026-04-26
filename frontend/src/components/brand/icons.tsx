// Custom inline icons matched to the DocQFlow design package. Each icon is
// keyed by its semantic name; pages and components import only what they need.
// We render currentColor so the icon picks up the surrounding text color.

import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement> & { size?: number }

function base(size: number, others: SVGProps<SVGSVGElement>): SVGProps<SVGSVGElement> {
  return {
    width: size,
    height: size,
    viewBox: '0 0 20 20',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.7,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
    ...others,
  }
}

export function DashboardIcon({ size = 16, ...rest }: IconProps) {
  return (
    <svg {...base(size, rest)}>
      <rect x="3" y="3" width="6" height="6" rx="1.5" />
      <rect x="11" y="3" width="6" height="6" rx="1.5" />
      <rect x="3" y="11" width="6" height="6" rx="1.5" />
      <rect x="11" y="11" width="6" height="6" rx="1.5" />
    </svg>
  )
}

export function InboxIcon({ size = 16, ...rest }: IconProps) {
  return (
    <svg {...base(size, rest)}>
      <path d="M3 12 V5 a2 2 0 0 1 2-2 h10 a2 2 0 0 1 2 2 v7" />
      <path d="M3 12 h4 l1 2 h4 l1-2 h4 v3 a2 2 0 0 1-2 2 H5 a2 2 0 0 1-2-2 z" />
    </svg>
  )
}

export function ChartIcon({ size = 16, ...rest }: IconProps) {
  return (
    <svg {...base(size, rest)}>
      <path d="M3 17 V8" />
      <path d="M8 17 V4" />
      <path d="M13 17 V11" />
      <path d="M18 17 V7" />
    </svg>
  )
}

export function SettingsIcon({ size = 16, ...rest }: IconProps) {
  return (
    <svg {...base(size, rest)}>
      <circle cx="10" cy="10" r="2.5" />
      <path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.2 4.2l1.4 1.4M14.4 14.4l1.4 1.4M4.2 15.8l1.4-1.4M14.4 5.6l1.4-1.4" />
    </svg>
  )
}

export function BellIcon({ size = 16, ...rest }: IconProps) {
  return (
    <svg {...base(size, rest)}>
      <path d="M5 8a5 5 0 0 1 10 0c0 5 2 6 2 6H3s2-1 2-6" />
      <path d="M8 17a2 2 0 0 0 4 0" />
    </svg>
  )
}

export function SearchIcon({ size = 16, ...rest }: IconProps) {
  return (
    <svg {...base(size, rest)}>
      <circle cx="9" cy="9" r="5.5" />
      <path d="m13 13 4 4" />
    </svg>
  )
}

export function UploadIcon({ size = 16, ...rest }: IconProps) {
  return (
    <svg {...base(size, rest)}>
      <path d="M10 13V3" />
      <path d="m6 7 4-4 4 4" />
      <path d="M3 13v3a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3" />
    </svg>
  )
}

export function DownloadIcon({ size = 16, ...rest }: IconProps) {
  return (
    <svg {...base(size, rest)}>
      <path d="M10 3v10" />
      <path d="m6 9 4 4 4-4" />
      <path d="M3 13v3a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3" />
    </svg>
  )
}

export function CheckIcon({ size = 16, ...rest }: IconProps) {
  return (
    <svg {...base(size, { ...rest, strokeWidth: 2 })}>
      <path d="m4 10 4 4 8-8" />
    </svg>
  )
}

export function XIcon({ size = 16, ...rest }: IconProps) {
  return (
    <svg {...base(size, { ...rest, strokeWidth: 2 })}>
      <path d="M5 5l10 10M15 5 5 15" />
    </svg>
  )
}

export function ArrowIcon({ size = 16, ...rest }: IconProps) {
  return (
    <svg {...base(size, rest)}>
      <path d="M4 10h12" />
      <path d="m12 6 4 4-4 4" />
    </svg>
  )
}

export function WarnIcon({ size = 14, ...rest }: IconProps) {
  return (
    <svg {...base(size, { ...rest, strokeWidth: 1.8 })}>
      <path d="m10 3 8 14H2z" />
      <path d="M10 8v4M10 14h.01" />
    </svg>
  )
}

export function EditIcon({ size = 14, ...rest }: IconProps) {
  return (
    <svg {...base(size, rest)}>
      <path d="M14 3l3 3-9 9-4 1 1-4z" />
    </svg>
  )
}

export function ZoomInIcon({ size = 14, ...rest }: IconProps) {
  return (
    <svg {...base(size, rest)}>
      <circle cx="9" cy="9" r="5" />
      <path d="m13 13 4 4M9 7v4M7 9h4" />
    </svg>
  )
}

export function ZoomOutIcon({ size = 14, ...rest }: IconProps) {
  return (
    <svg {...base(size, rest)}>
      <circle cx="9" cy="9" r="5" />
      <path d="m13 13 4 4M7 9h4" />
    </svg>
  )
}

export function ChevronRightIcon({ size = 14, ...rest }: IconProps) {
  return (
    <svg {...base(size, { ...rest, strokeWidth: 1.8 })}>
      <path d="m8 5 5 5-5 5" />
    </svg>
  )
}

export function ChevronLeftIcon({ size = 14, ...rest }: IconProps) {
  return (
    <svg {...base(size, { ...rest, strokeWidth: 1.8 })}>
      <path d="m12 5-5 5 5 5" />
    </svg>
  )
}

export function ChevronDownIcon({ size = 14, ...rest }: IconProps) {
  return (
    <svg {...base(size, { ...rest, strokeWidth: 1.8 })}>
      <path d="m5 8 5 5 5-5" />
    </svg>
  )
}

export function DocIcon({ size = 14, ...rest }: IconProps) {
  return (
    <svg {...base(size, rest)}>
      <path d="M5 3h7l4 4v10a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
      <path d="M12 3v4h4" />
    </svg>
  )
}

export function UserIcon({ size = 14, ...rest }: IconProps) {
  return (
    <svg {...base(size, rest)}>
      <circle cx="10" cy="7" r="3" />
      <path d="M3 17c1-3 4-5 7-5s6 2 7 5" />
    </svg>
  )
}

export function PinIcon({ size = 14, ...rest }: IconProps) {
  return (
    <svg {...base(size, rest)}>
      <path d="M10 2a5 5 0 0 1 5 5c0 4-5 11-5 11S5 11 5 7a5 5 0 0 1 5-5z" />
      <circle cx="10" cy="7" r="1.6" />
    </svg>
  )
}

export function HashIcon({ size = 14, ...rest }: IconProps) {
  return (
    <svg {...base(size, rest)}>
      <path d="M4 7h13M3 13h13M7 3 6 17M14 3l-1 14" />
    </svg>
  )
}

export function BuildingIcon({ size = 14, ...rest }: IconProps) {
  return (
    <svg {...base(size, rest)}>
      <rect x="4" y="3" width="12" height="14" rx="1" />
      <path d="M7 6h2M11 6h2M7 9h2M11 9h2M7 12h2M11 12h2M9 17v-3h2v3" />
    </svg>
  )
}

export function BoltIcon({ size = 14, ...rest }: IconProps) {
  return (
    <svg {...base(size, rest)}>
      <path d="M11 2 4 12h5l-1 6 7-10h-5z" />
    </svg>
  )
}

export function DropIcon({ size = 14, ...rest }: IconProps) {
  return (
    <svg {...base(size, rest)}>
      <path d="M10 2c2 4 5 6 5 10a5 5 0 0 1-10 0c0-4 3-6 5-10z" />
    </svg>
  )
}

export function MapIcon({ size = 14, ...rest }: IconProps) {
  return (
    <svg {...base(size, rest)}>
      <path d="M2 5v12l5-2 6 2 5-2V3l-5 2-6-2z" />
      <path d="M7 3v12M13 7v12" />
    </svg>
  )
}

export function FilterIcon({ size = 14, ...rest }: IconProps) {
  return (
    <svg {...base(size, rest)}>
      <path d="M3 5h14l-5 7v5l-4-2v-3z" />
    </svg>
  )
}

export function SparkleIcon({ size = 14, ...rest }: IconProps) {
  return (
    <svg {...base(size, rest)}>
      <path d="M10 3v3M10 14v3M3 10h3M14 10h3M5 5l2 2M13 13l2 2M5 15l2-2M13 7l2-2" />
    </svg>
  )
}

export function CommandIcon({ size = 14, ...rest }: IconProps) {
  return (
    <svg {...base(size, rest)}>
      <path d="M7 5a2 2 0 1 0-2 2h10a2 2 0 1 0-2-2v10a2 2 0 1 0 2-2H5a2 2 0 1 0 2 2z" />
    </svg>
  )
}

export function ShieldIcon({ size = 14, ...rest }: IconProps) {
  return (
    <svg {...base(size, rest)}>
      <path d="M10 2 3 5v5c0 4 3 7 7 8 4-1 7-4 7-8V5z" />
      <path d="m7 10 2 2 4-4" />
    </svg>
  )
}

export function FlagIcon({ size = 14, ...rest }: IconProps) {
  return (
    <svg {...base(size, rest)}>
      <path d="M5 3v15" />
      <path d="M5 4h10l-2 3 2 3H5" />
    </svg>
  )
}

export function ClockIcon({ size = 14, ...rest }: IconProps) {
  return (
    <svg {...base(size, rest)}>
      <circle cx="10" cy="10" r="7" />
      <path d="M10 6v4l3 2" />
    </svg>
  )
}

export function SunIcon({ size = 18, ...rest }: IconProps) {
  return (
    <svg {...base(size, rest)}>
      <circle cx="10" cy="10" r="3.4" />
      <path d="M10 2.5v2M10 15.5v2M2.5 10h2M15.5 10h2M4.6 4.6l1.4 1.4M14 14l1.4 1.4M4.6 15.4 6 14M14 6l1.4-1.4" />
    </svg>
  )
}

export function MoonIcon({ size = 18, ...rest }: IconProps) {
  return (
    <svg {...base(size, rest)}>
      <path d="M16.5 12.4A6.5 6.5 0 1 1 7.6 3.5 5.5 5.5 0 0 0 16.5 12.4Z" />
    </svg>
  )
}

// Map of icon names to components, used by data-driven UIs (NAV, departments)
// where the icon is selected by string key.
// eslint-disable-next-line react-refresh/only-export-components
export const Icons = {
  dashboard: DashboardIcon,
  inbox: InboxIcon,
  chart: ChartIcon,
  settings: SettingsIcon,
  bell: BellIcon,
  search: SearchIcon,
  upload: UploadIcon,
  download: DownloadIcon,
  check: CheckIcon,
  x: XIcon,
  arrow: ArrowIcon,
  warn: WarnIcon,
  edit: EditIcon,
  zoomIn: ZoomInIcon,
  zoomOut: ZoomOutIcon,
  chevR: ChevronRightIcon,
  chevL: ChevronLeftIcon,
  chevD: ChevronDownIcon,
  doc: DocIcon,
  user: UserIcon,
  pin: PinIcon,
  hash: HashIcon,
  building: BuildingIcon,
  bolt: BoltIcon,
  drop: DropIcon,
  map: MapIcon,
  filter: FilterIcon,
  sparkle: SparkleIcon,
  cmd: CommandIcon,
  shield: ShieldIcon,
  flag: FlagIcon,
  clock: ClockIcon,
  sun: SunIcon,
  moon: MoonIcon,
} as const

export type IconName = keyof typeof Icons
