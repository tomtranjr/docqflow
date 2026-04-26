import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
  useState,
  type ReactNode,
  type Dispatch,
} from 'react'
import type { UploadItem, PredictionResponse, QueuedResult } from '@/lib/types'

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

interface UploadContextValue {
  items: UploadItem[]
  dispatch: Dispatch<Action>
  queueResults: QueuedResult[]
  setQueueResults: (results: QueuedResult[]) => void
  clearQueueResults: () => void
}

const UploadContext = createContext<UploadContextValue | null>(null)

export function UploadProvider({ children }: { children: ReactNode }) {
  const [items, dispatch] = useReducer(reducer, [])
  const [queueResults, setQueueResultsState] = useState<QueuedResult[]>([])

  const setQueueResults = useCallback((results: QueuedResult[]) => {
    setQueueResultsState(results)
  }, [])

  const clearQueueResults = useCallback(() => {
    setQueueResultsState([])
  }, [])

  const value = useMemo<UploadContextValue>(
    () => ({ items, dispatch, queueResults, setQueueResults, clearQueueResults }),
    [items, queueResults, setQueueResults, clearQueueResults],
  )

  return <UploadContext.Provider value={value}>{children}</UploadContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useUploadContext() {
  const ctx = useContext(UploadContext)
  if (!ctx) throw new Error('useUploadContext must be inside UploadProvider')
  return ctx
}
