import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

type Theme = 'light' | 'dark' | 'system'

interface Preferences {
  theme: Theme
  showConfidence: boolean
  reviewerName: string
}

interface PreferencesContextValue extends Preferences {
  setTheme: (t: Theme) => void
  setShowConfidence: (b: boolean) => void
  setReviewerName: (s: string) => void
}

const STORAGE_KEY = 'docqflow.prefs'

const DEFAULTS: Preferences = {
  theme: 'system',
  showConfidence: false,
  reviewerName: 'Reviewer',
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
    setReviewerName: (reviewerName) => setPrefs((p) => ({ ...p, reviewerName })),
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
