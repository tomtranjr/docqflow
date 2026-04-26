import type { ReactNode } from 'react'

interface AuthShellProps {
  children: ReactNode
}

export function AuthShell({ children }: AuthShellProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-surface-base)] px-4 py-12">
      <div className="w-full max-w-sm">{children}</div>
    </div>
  )
}
