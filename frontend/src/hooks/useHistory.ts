import { useState, useEffect, useCallback } from 'react'
import { getHistory } from '@/lib/api'
import type { HistoryEntry } from '@/lib/types'
import { DEFAULT_PAGE_SIZE } from '@/lib/constants'

export function useHistory() {
  const [entries, setEntries] = useState<HistoryEntry[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [label, setLabelInternal] = useState('')
  const [search, setSearchInternal] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const setLabel = useCallback((newLabel: string) => {
    setLabelInternal(newLabel)
    setPage(1)
  }, [])

  const setSearch = useCallback((newSearch: string) => {
    setSearchInternal(newSearch)
    setPage(1)
  }, [])

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getHistory({
        page,
        limit: DEFAULT_PAGE_SIZE,
        label: label || undefined,
        search: search || undefined,
      })
      setEntries(data.items)
      setTotal(data.total)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load history')
    } finally {
      setLoading(false)
    }
  }, [page, label, search])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { entries, total, page, setPage, label, setLabel, search, setSearch, loading, error, refresh: fetchData }
}
