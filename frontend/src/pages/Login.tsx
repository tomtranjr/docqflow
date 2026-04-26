import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Wordmark } from '@/components/brand/Wordmark'
import { usePreferences } from '@/context/PreferencesContext'

export function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const { setReviewerName } = usePreferences()
  const navigate = useNavigate()

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!email.trim() || !password.trim()) return
    setReviewerName(email.split('@')[0] || 'reviewer')
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
          Sign in to DocQFlow
        </h1>
        <p style={{ fontSize: 12, color: 'var(--ink-3)', textAlign: 'center', margin: '0 0 22px' }}>
          City &amp; County of San Francisco · DBI
        </p>

        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: 'var(--ink-2)' }}>
            <span style={{ fontWeight: 600 }}>Email</span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                height: 36,
                padding: '0 12px',
                border: '1px solid var(--line-2)',
                borderRadius: 'var(--r)',
                background: 'var(--surface-card)',
                color: 'var(--ink)',
                fontSize: 13,
              }}
            />
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: 'var(--ink-2)' }}>
            <span style={{ fontWeight: 600 }}>Password</span>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                height: 36,
                padding: '0 12px',
                border: '1px solid var(--line-2)',
                borderRadius: 'var(--r)',
                background: 'var(--surface-card)',
                color: 'var(--ink)',
                fontSize: 13,
              }}
            />
          </label>

          <button type="submit" className="btn btn-primary btn-lg" style={{ marginTop: 4, justifyContent: 'center' }}>
            Sign in
          </button>
        </form>
      </div>
    </div>
  )
}
