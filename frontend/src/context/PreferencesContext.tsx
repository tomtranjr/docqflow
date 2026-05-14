import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

type Theme = 'light' | 'dark' | 'system'

interface Preferences {
  theme: Theme
  showConfidence: boolean
  reviewerName: string
  firstName: string
  lastName: string
  isAuthenticated: boolean
}

interface PreferencesContextValue extends Preferences {
  setTheme: (t: Theme) => void
  setShowConfidence: (b: boolean) => void
  setReviewerName: (s: string) => void
  setReviewerFullName: (firstName: string, lastName: string) => void
  signInAsGuest: () => void
  signOut: () => void
}

const STORAGE_KEY = 'docqflow.prefs'

const DEFAULTS: Preferences = {
  theme: 'system',
  showConfidence: false,
  reviewerName: 'Reviewer',
  firstName: '',
  lastName: '',
  isAuthenticated: false,
}

const Ctx = createContext<PreferencesContextValue | null>(null)

function loadFromStorage(): Preferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULTS
    return { ...DEFAULTS, ...JSON.parse(raw) }
  } catch {
    return DEFAULTS
  }
}

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<Preferences>(loadFromStorage)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
    document.documentElement.dataset.theme =
      prefs.theme === 'system'
        ? window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light'
        : prefs.theme
  }, [prefs])

  const value: PreferencesContextValue = {
    ...prefs,
    setTheme: (theme) => setPrefs((p) => ({ ...p, theme })),
    setShowConfidence: (showConfidence) => setPrefs((p) => ({ ...p, showConfidence })),
    setReviewerName: (reviewerName) =>
      setPrefs((p) => ({ ...p, reviewerName, firstName: '', lastName: '' })),
    setReviewerFullName: (firstName, lastName) =>
      setPrefs((p) => ({
        ...p,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        reviewerName: `${firstName.trim()} ${lastName.trim()}`.trim() || 'Reviewer',
        isAuthenticated: true,
      })),
    signInAsGuest: () =>
      setPrefs((p) => ({
        ...p,
        isAuthenticated: true,
        firstName: '',
        lastName: '',
        reviewerName: 'Reviewer',
      })),
    signOut: () =>
      setPrefs((p) => ({
        ...p,
        isAuthenticated: false,
        firstName: '',
        lastName: '',
        reviewerName: 'Reviewer',
      })),
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function usePreferences(): PreferencesContextValue {
  const v = useContext(Ctx)
  if (!v) throw new Error('usePreferences must be used inside PreferencesProvider')
  return v
}

// Reader hooks for narrow re-render scope
// eslint-disable-next-line react-refresh/only-export-components
export const useTheme = () => usePreferences().theme
// eslint-disable-next-line react-refresh/only-export-components
export const useShowConfidence = () => usePreferences().showConfidence
// eslint-disable-next-line react-refresh/only-export-components
export const useReviewerName = () => usePreferences().reviewerName
// eslint-disable-next-line react-refresh/only-export-components
export const useFirstName = () => usePreferences().firstName
// eslint-disable-next-line react-refresh/only-export-components
export const useLastName = () => usePreferences().lastName
// eslint-disable-next-line react-refresh/only-export-components
export const useIsAuthenticated = () => usePreferences().isAuthenticated
