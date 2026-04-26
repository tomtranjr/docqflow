import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { AuthShell } from '@/components/layout/AuthShell'
import { Logo } from '@/components/common/Logo'
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
    <AuthShell>
      <div className="flex flex-col items-center gap-6 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-elev1)] p-8 shadow-[var(--shadow-card)]">
        <Logo size="md" withSlogan />

        <form onSubmit={onSubmit} className="flex w-full flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-[var(--color-text-primary)]">Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface-base)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-accent)]"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-[var(--color-text-primary)]">Password</span>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface-base)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-accent)]"
            />
          </label>

          <button
            type="submit"
            className="mt-2 rounded-[var(--radius-sm)] bg-[var(--color-brand-primary)] px-3 py-2 text-sm font-semibold text-white hover:bg-[var(--color-brand-primary-hover,var(--color-brand-primary))]"
          >
            Sign in
          </button>
        </form>
      </div>
    </AuthShell>
  )
}
