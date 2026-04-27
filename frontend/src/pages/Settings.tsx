import { useState, type ReactNode } from 'react'
import { CheckIcon, Icons, XIcon } from '@/components/brand/icons'
import { AboutContent } from '@/components/about/AboutContent'
import { DEPARTMENTS } from '@/lib/permitData'
import { usePreferences, useShowConfidence } from '@/context/PreferencesContext'

type SectionKey = 'profile' | 'appearance' | 'notifications' | 'extraction' | 'departments' | 'shortcuts' | 'security' | 'about'

interface SectionMeta {
  k: SectionKey
  label: string
  icon: keyof typeof Icons
}

const SECTIONS: SectionMeta[] = [
  { k: 'profile', label: 'Profile', icon: 'user' },
  { k: 'appearance', label: 'Appearance', icon: 'sparkle' },
  { k: 'notifications', label: 'Notifications', icon: 'bell' },
  { k: 'extraction', label: 'Extraction rules', icon: 'sparkle' },
  { k: 'departments', label: 'Departments', icon: 'building' },
  { k: 'shortcuts', label: 'Keyboard shortcuts', icon: 'cmd' },
  { k: 'security', label: 'Security', icon: 'shield' },
  { k: 'about', label: 'About DocQFlow', icon: 'doc' },
]

interface FormRowProps {
  label: ReactNode
  sub?: string
  children: ReactNode
}

function FormRow({ label, sub, children }: FormRowProps) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '240px 1fr',
        gap: 24,
        padding: '18px 0',
        borderBottom: '1px solid var(--line)',
        alignItems: 'flex-start',
      }}
    >
      <div>
        <div style={{ fontSize: 13, fontWeight: 600 }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 4 }}>{sub}</div>}
      </div>
      <div>{children}</div>
    </div>
  )
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      style={{
        width: '100%',
        height: 36,
        padding: '0 12px',
        border: '1px solid var(--line-2)',
        borderRadius: 'var(--r)',
        background: 'var(--surface-card)',
        fontSize: 13,
        color: 'var(--ink)',
        ...(props.style ?? {}),
      }}
    />
  )
}

interface ToggleProps {
  on: boolean
  onChange: (v: boolean) => void
  label?: string
}

function Toggle({ on, onChange, label }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label ?? 'Toggle'}
      onClick={() => onChange(!on)}
      style={{
        width: 38,
        height: 22,
        borderRadius: 11,
        background: on ? 'var(--blue-500)' : 'var(--line-2)',
        border: 'none',
        padding: 2,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: on ? 'flex-end' : 'flex-start',
        transition: 'all .15s var(--ease)',
      }}
    >
      <span
        style={{
          width: 18,
          height: 18,
          borderRadius: '50%',
          background: '#fff',
          boxShadow: '0 1px 3px rgba(0,0,0,.2)',
        }}
      />
    </button>
  )
}

function ProfileSection({ name }: { name: string }) {
  return (
    <>
      <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 4px' }}>Profile</h2>
      <p style={{ fontSize: 12, color: 'var(--ink-3)', margin: '0 0 8px' }}>Your reviewer identity and signature</p>
      <FormRow label="Photo">
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #4D8AF7, #1F5BD7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontWeight: 700,
              fontSize: 18,
            }}
          >
            {name.slice(0, 2).toUpperCase()}
          </div>
          <button type="button" className="btn">Upload new</button>
          <button type="button" className="btn btn-ghost" style={{ color: 'var(--danger)' }}>
            Remove
          </button>
        </div>
      </FormRow>
      <FormRow label="Full name">
        <Input defaultValue={name} aria-label="Full name" />
      </FormRow>
      <FormRow label="Title" sub="Shown next to your name on approvals">
        <Input defaultValue="Plan Reviewer · DBI" aria-label="Title" />
      </FormRow>
      <FormRow label="Email">
        <Input defaultValue={`${name.toLowerCase()}@sfgov.org`} aria-label="Email" />
      </FormRow>
      <FormRow label="Department">
        <Input defaultValue="Department of Building Inspection" aria-label="Department" />
      </FormRow>
      <FormRow label="Approval signature" sub="Embedded as text on approved permit certificates">
        <Input
          defaultValue={name}
          style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: 16 }}
          aria-label="Approval signature"
        />
      </FormRow>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 18 }}>
        <button type="button" className="btn">Cancel</button>
        <button type="button" className="btn btn-accent">Save changes</button>
      </div>
    </>
  )
}

function AppearanceSection() {
  const { theme, setTheme } = usePreferences()
  const showConfidence = useShowConfidence()
  const { setShowConfidence } = usePreferences()

  return (
    <>
      <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 4px' }}>Appearance</h2>
      <p style={{ fontSize: 12, color: 'var(--ink-3)', margin: '0 0 8px' }}>How DocQFlow looks for you</p>
      <FormRow label="Theme" sub="Light = Govtech Calm, Dark = Editorial Cockpit">
        <div style={{ display: 'flex', gap: 6, padding: 3, background: 'var(--surface-sunken)', borderRadius: 'var(--r)', width: 'fit-content' }}>
          {(['light', 'dark', 'system'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTheme(t)}
              style={{
                height: 30,
                padding: '0 14px',
                border: 'none',
                cursor: 'pointer',
                background: theme === t ? 'var(--surface-card)' : 'transparent',
                color: theme === t ? 'var(--ink)' : 'var(--ink-3)',
                fontSize: 12,
                fontWeight: 500,
                borderRadius: 6,
                boxShadow: theme === t ? 'var(--shadow-1)' : 'none',
                textTransform: 'capitalize',
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </FormRow>
      <FormRow label="Show confidence by default" sub="Toggle on extracted-field confidence numbers in Review">
        <Toggle on={showConfidence} onChange={setShowConfidence} label="Show confidence by default" />
      </FormRow>
    </>
  )
}

function NotificationsSection() {
  const [s, setS] = useState({ assigned: true, low: true, daily: false, sla: true, overdue: true })
  return (
    <>
      <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 4px' }}>Notifications</h2>
      <p style={{ fontSize: 12, color: 'var(--ink-3)', margin: '0 0 8px' }}>Choose how DocQFlow alerts you</p>
      <FormRow label="Permit assigned to me" sub="Email + in-app">
        <Toggle on={s.assigned} onChange={(v) => setS({ ...s, assigned: v })} label="Permit assigned" />
      </FormRow>
      <FormRow label="Low-confidence extraction" sub="Confidence < 70%">
        <Toggle on={s.low} onChange={(v) => setS({ ...s, low: v })} label="Low confidence" />
      </FormRow>
      <FormRow label="Daily digest" sub="9:00am summary of your queue">
        <Toggle on={s.daily} onChange={(v) => setS({ ...s, daily: v })} label="Daily digest" />
      </FormRow>
      <FormRow label="SLA approaching" sub="Permit will breach 5-day SLA in 24h">
        <Toggle on={s.sla} onChange={(v) => setS({ ...s, sla: v })} label="SLA approaching" />
      </FormRow>
      <FormRow label="Permit overdue" sub="Past 5-day SLA">
        <Toggle on={s.overdue} onChange={(v) => setS({ ...s, overdue: v })} label="Overdue" />
      </FormRow>
    </>
  )
}

function ExtractionSection() {
  return (
    <>
      <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 4px' }}>Extraction rules</h2>
      <p style={{ fontSize: 12, color: 'var(--ink-3)', margin: '0 0 8px' }}>Confidence thresholds and required fields</p>
      <FormRow label="Auto-approve threshold" sub="Permits above this skip human review">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <input type="range" min="80" max="99" defaultValue="95" style={{ flex: 1 }} aria-label="Auto-approve threshold" />
          <span className="mono tabular" style={{ fontWeight: 600, fontSize: 13, minWidth: 40 }}>95%</span>
        </div>
      </FormRow>
      <FormRow label="Flag for review threshold" sub="Below this, mark as low-confidence">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <input type="range" min="40" max="80" defaultValue="70" style={{ flex: 1 }} aria-label="Flag threshold" />
          <span className="mono tabular" style={{ fontWeight: 600, fontSize: 13, minWidth: 40 }}>70%</span>
        </div>
      </FormRow>
      <FormRow label="Required fields" sub="Permits missing these are blocked from approval">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {['Applicant Name', 'Project Address', 'Parcel Number', 'Permit Type', 'Estimated Cost', 'Contractor License'].map((f) => (
            <span key={f} className="pill pill-info" style={{ height: 24 }}>
              {f} <XIcon size={10} />
            </span>
          ))}
          <button type="button" className="btn btn-sm btn-ghost">+ Add field</button>
        </div>
      </FormRow>
    </>
  )
}

function DepartmentsSection() {
  return (
    <>
      <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 4px' }}>Departments &amp; routing</h2>
      <p style={{ fontSize: 12, color: 'var(--ink-3)', margin: '0 0 8px' }}>How auto-classified permits are routed</p>
      {DEPARTMENTS.map((d) => {
        const Icon = Icons[d.icon]
        return (
          <FormRow
            key={d.key}
            label={
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: d.accent }}>
                  <Icon size={14} />
                </span>
                {d.key}
              </span>
            }
            sub={`${d.count} active permits`}
          >
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <Input defaultValue={`${d.key.toLowerCase()}@sfgov.org`} style={{ flex: 1 }} aria-label={`${d.key} email`} />
              <button type="button" className="btn btn-sm">Test route</button>
            </div>
          </FormRow>
        )
      })}
    </>
  )
}

const SHORTCUTS: [string, string][] = [
  ['⌘ K', 'Open command palette'],
  ['⌘ J', 'Jump to next permit'],
  ['⌘ ⇧ J', 'Jump to previous permit'],
  ['A', 'Approve current permit'],
  ['R', 'Request more info'],
  ['E', 'Edit fields'],
  ['F', 'Flag permit'],
  ['G then D', 'Go to Dashboard'],
  ['G then S', 'Go to Submissions'],
  ['G then R', 'Go to Reports'],
  ['?', 'Show this list'],
]

function ShortcutsSection() {
  return (
    <>
      <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 16px' }}>Keyboard shortcuts</h2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 32px' }}>
        {SHORTCUTS.map(([k, l]) => (
          <div
            key={k}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '10px 0',
              borderBottom: '1px solid var(--line)',
              fontSize: 13,
            }}
          >
            <span>{l}</span>
            <kbd
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                padding: '3px 8px',
                background: 'var(--surface-sunken)',
                border: '1px solid var(--line-2)',
                borderRadius: 4,
                color: 'var(--ink-2)',
              }}
            >
              {k}
            </kbd>
          </div>
        ))}
      </div>
    </>
  )
}

function SecuritySection() {
  return (
    <>
      <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 4px' }}>Security</h2>
      <p style={{ fontSize: 12, color: 'var(--ink-3)', margin: '0 0 8px' }}>Session and access management</p>
      <FormRow label="Two-factor authentication" sub="Required for all SFgov accounts">
        <span className="pill pill-success" style={{ height: 24 }}>
          <CheckIcon size={11} /> Enabled · authenticator app
        </span>
      </FormRow>
      <FormRow label="Active sessions" sub="Where you're signed in">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[
            { d: 'MacBook Pro · Safari', l: 'San Francisco, CA · this device', a: true },
            { d: 'iPhone 15 · DocQFlow app', l: 'San Francisco, CA · 2h ago', a: false },
          ].map((s) => (
            <div
              key={s.d}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '10px 12px',
                border: '1px solid var(--line)',
                borderRadius: 6,
                alignItems: 'center',
              }}
            >
              <div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>
                  {s.d}
                  {s.a && (
                    <span className="pill pill-success" style={{ marginLeft: 8, height: 18, fontSize: 10 }}>
                      This device
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{s.l}</div>
              </div>
              {!s.a && (
                <button type="button" className="btn btn-sm">
                  Sign out
                </button>
              )}
            </div>
          ))}
        </div>
      </FormRow>
      <FormRow label="API access" sub="For integration with the citizen portal">
        <button type="button" className="btn">
          Manage API keys
        </button>
      </FormRow>
    </>
  )
}

function AboutSection() {
  return <AboutContent />
}

export function Settings() {
  const [section, setSection] = useState<SectionKey>('profile')
  const { reviewerName } = usePreferences()
  const display = reviewerName === 'Reviewer' ? 'Alex Smith' : reviewerName

  return (
    <div style={{ padding: 'var(--pad-page)' }}>
      <div style={{ marginBottom: 20 }}>
        <div className="label-eyebrow" style={{ marginBottom: 4 }}>
          Account
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, letterSpacing: '-0.01em' }}>Settings</h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 24 }}>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }} aria-label="Settings sections">
          {SECTIONS.map((s) => {
            const Icon = Icons[s.icon]
            const active = section === s.k
            return (
              <button
                key={s.k}
                type="button"
                onClick={() => setSection(s.k)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 12px',
                  borderRadius: 6,
                  background: active ? 'var(--blue-50)' : 'transparent',
                  color: active ? 'var(--ink)' : 'var(--ink-2)',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: active ? 600 : 500,
                  textAlign: 'left',
                }}
              >
                <span style={{ color: active ? 'var(--blue-500)' : 'var(--ink-4)' }}>
                  <Icon size={14} />
                </span>
                {s.label}
              </button>
            )
          })}
        </nav>

        <div className="card" style={{ padding: '24px 28px' }}>
          {section === 'profile' && <ProfileSection name={display || 'Alex Smith'} />}
          {section === 'appearance' && <AppearanceSection />}
          {section === 'notifications' && <NotificationsSection />}
          {section === 'extraction' && <ExtractionSection />}
          {section === 'departments' && <DepartmentsSection />}
          {section === 'shortcuts' && <ShortcutsSection />}
          {section === 'security' && <SecuritySection />}
          {section === 'about' && <AboutSection />}
        </div>
      </div>
    </div>
  )
}

