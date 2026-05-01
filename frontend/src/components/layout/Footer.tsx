import { Link } from 'react-router-dom'
import { SFSeal } from '@/components/brand/SFSeal'

export function Footer() {
  return (
    <footer
      style={{
        padding: '16px 28px',
        borderTop: '1px solid var(--line)',
        background: 'var(--surface-card)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: 12,
        color: 'var(--ink-4)',
        flexWrap: 'wrap',
        gap: 12,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <SFSeal size={20} />
        <span>City &amp; County of San Francisco · Department of Building Inspection</span>
      </div>
      <div style={{ display: 'flex', gap: 18 }}>
        <span>v2.4.0</span>
        <Link to="/app/about">About</Link>
        <span>Privacy</span>
        <span>Accessibility</span>
        <span>Help</span>
      </div>
    </footer>
  )
}
