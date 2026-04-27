import { AboutContent } from '@/components/about/AboutContent'

export function About() {
  return (
    <div style={{ padding: 'var(--pad-page)' }}>
      <div style={{ marginBottom: 20 }}>
        <div className="label-eyebrow" style={{ marginBottom: 4 }}>About</div>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, letterSpacing: '-0.01em' }}>About DocQFlow</h1>
        <p style={{ fontSize: 13, color: 'var(--ink-3)', margin: '4px 0 0' }}>How the system works, end to end.</p>
      </div>
      <AboutContent showHeader={false} />
    </div>
  )
}
