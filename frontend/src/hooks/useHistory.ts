import { useState, useEffect, useCallback } from 'react'
import { getHistory } from '@/lib/api'
import type { HistoryEntry } from '@/lib/types'
import { DEFAULT_PAGE_SIZE } from '@/lib/constants'

export function useHistory() {
  const [entries, setEntries] = useState<HistoryEntry[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [label, setLabel] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getHistory({
        page,
        limit: DEFAULT_PAGE_SIZE,
        label: label || undefined,
        search: search || undefined,
      })
      setEntries(data.items)
      setTotal(data.total)
    } catch {
      // handled by toast in the future
    } finally {
      setLoading(false)
    }
  }, [page, label, search])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { entries, total, page, setPage, label, setLabel, search, setSearch, loading, refresh: fetchData }
}
