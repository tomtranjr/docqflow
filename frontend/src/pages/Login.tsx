import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Wordmark } from '@/components/brand/Wordmark'
import { usePreferences } from '@/context/PreferencesContext'

type Mode = 'choose' | 'signup'

const inputStyle = {
  height: 36,
  padding: '0 12px',
  border: '1px solid var(--line-2)',
  borderRadius: 'var(--r)',
  background: 'var(--surface-card)',
  color: 'var(--ink)',
  fontSize: 13,
} as const

const labelStyle = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: 4,
  fontSize: 12,
  color: 'var(--ink-2)',
}

export function Login() {
  const [mode, setMode] = useState<Mode>('choose')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const { setReviewerFullName, signInAsGuest } = usePreferences()
  const navigate = useNavigate()

  function onLogIn() {
    signInAsGuest()
    navigate('/app')
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password.trim()) return
    setReviewerFullName(firstName, lastName)
    navigate('/app')
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--surface-app)',
        padding: '32px 16px',
      }}
    >
      <div className="card" style={{ width: '100%', maxWidth: 380, padding: '32px 28px' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 18 }}>
          <Wordmark size={22} />
        </div>
        <h1 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 4px', textAlign: 'center' }}>
          {mode === 'choose' ? 'Welcome to DocQFlow' : 'Create your DocQFlow account'}
        </h1>
        <p style={{ fontSize: 12, color: 'var(--ink-3)', textAlign: 'center', margin: '0 0 22px' }}>
          City &amp; County of San Francisco · DBI
        </p>

        {mode === 'choose' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button
              type="button"
              className="btn btn-primary btn-lg"
              style={{ justifyContent: 'center' }}
              onClick={onLogIn}
            >
              Log in
            </button>
            <button
              type="button"
              className="btn btn-lg"
              style={{ justifyContent: 'center' }}
              onClick={() => setMode('signup')}
            >
              Create account
            </button>
            <p style={{ fontSize: 11, color: 'var(--ink-3)', textAlign: 'center', margin: '8px 0 0' }}>
              Log in to skip account setup — you can add your name later in Preferences.
            </p>
          </div>
        ) : (
          <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <button
              type="button"
              onClick={() => setMode('choose')}
              style={{
                alignSelf: 'flex-start',
                background: 'none',
                border: 'none',
                padding: 0,
                color: 'var(--ink-2)',
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              ← Back
            </button>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <label style={{ ...labelStyle, minWidth: 0 }}>
                <span style={{ fontWeight: 600 }}>First name</span>
                <input
                  type="text"
                  required
                  autoComplete="given-name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }}
                />
              </label>
              <label style={{ ...labelStyle, minWidth: 0 }}>
                <span style={{ fontWeight: 600 }}>Last name</span>
                <input
                  type="text"
                  required
                  autoComplete="family-name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }}
                />
              </label>
            </div>

            <label style={labelStyle}>
              <span style={{ fontWeight: 600 }}>Email</span>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={inputStyle}
              />
            </label>

            <label style={labelStyle}>
              <span style={{ fontWeight: 600 }}>Password</span>
              <input
                type="password"
                required
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={inputStyle}
              />
            </label>

            <button type="submit" className="btn btn-primary btn-lg" style={{ marginTop: 4, justifyContent: 'center' }}>
              Create account
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
