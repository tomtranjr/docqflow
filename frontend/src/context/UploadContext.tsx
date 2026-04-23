import { createContext, useContext, useReducer, type ReactNode, type Dispatch } from 'react'
import type { UploadItem, PredictionResponse } from '@/lib/types'

type Action =
  | { type: 'ADD_FILES'; items: { id: string; file: File }[] }
  | { type: 'SET_STATUS'; id: string; status: UploadItem['status'] }
  | { type: 'SET_RESULT'; id: string; result: PredictionResponse }
  | { type: 'SET_ERROR'; id: string; error: string }
  | { type: 'CLEAR' }

function reducer(state: UploadItem[], action: Action): UploadItem[] {
  switch (action.type) {
    case 'ADD_FILES':
      return [
        ...state,
        ...action.items.map(({ id, file }) => ({ id, file, status: 'idle' as const })),
      ]
    case 'SET_STATUS':
      return state.map((item) =>
        item.id === action.id ? { ...item, status: action.status } : item,
      )
    case 'SET_RESULT':
      return state.map((item) =>
        item.id === action.id ? { ...item, status: 'done' as const, result: action.result } : item,
      )
    case 'SET_ERROR':
      return state.map((item) =>
        item.id === action.id ? { ...item, status: 'error' as const, error: action.error } : item,
      )
    case 'CLEAR':
      return []
    default:
      return state
  }
}

const UploadContext = createContext<{ items: UploadItem[]; dispatch: Dispatch<Action> } | null>(null)

export function UploadProvider({ children }: { children: ReactNode }) {
  const [items, dispatch] = useReducer(reducer, [])
  return <UploadContext.Provider value={{ items, dispatch }}>{children}</UploadContext.Provider>
}

export function useUploadContext() {
  const ctx = useContext(UploadContext)
  if (!ctx) throw new Error('useUploadContext must be inside UploadProvider')
  return ctx
}
