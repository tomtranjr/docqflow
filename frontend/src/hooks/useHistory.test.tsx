import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { DEFAULT_PAGE_SIZE } from '@/lib/constants'

const getHistoryMock = vi.fn()
vi.mock('@/lib/api', () => ({
  getHistory: (params: unknown) => getHistoryMock(params),
}))

import { useHistory } from './useHistory'

function okResponse(items: unknown[] = [], total = 0, page = 1) {
  return { items, total, page }
}

describe('useHistory', () => {
  beforeEach(() => {
    getHistoryMock.mockReset()
  })

  it('fetches page 1 with the default page size on mount', async () => {
    getHistoryMock.mockResolvedValueOnce(okResponse([], 0, 1))

    const { result } = renderHook(() => useHistory())

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(getHistoryMock).toHaveBeenCalledWith({
      page: 1,
      limit: DEFAULT_PAGE_SIZE,
      label: undefined,
      search: undefined,
    })
    expect(result.current.error).toBeNull()
  })

  it('setLabel resets page to 1 and refetches with the label param', async () => {
    getHistoryMock.mockResolvedValue(okResponse([], 0, 1))

    const { result } = renderHook(() => useHistory())
    await waitFor(() => expect(result.current.loading).toBe(false))

    act(() => result.current.setPage(3))
    await waitFor(() => expect(result.current.page).toBe(3))

    act(() => result.current.setLabel('permit-3-8'))
    await waitFor(() => expect(result.current.page).toBe(1))

    const lastCall = getHistoryMock.mock.calls.at(-1)![0]
    expect(lastCall).toMatchObject({ page: 1, label: 'permit-3-8' })
  })

  it('setPage(2) triggers a refetch with page=2', async () => {
    getHistoryMock.mockResolvedValue(okResponse([], 0, 1))

    const { result } = renderHook(() => useHistory())
    await waitFor(() => expect(result.current.loading).toBe(false))

    act(() => result.current.setPage(2))
    await waitFor(() => {
      const lastCall = getHistoryMock.mock.calls.at(-1)![0]
      expect(lastCall.page).toBe(2)
    })
  })

  it('surfaces the error message and clears loading when the API rejects', async () => {
    getHistoryMock.mockRejectedValueOnce(new Error('server exploded'))

    const { result } = renderHook(() => useHistory())

    await waitFor(() => expect(result.current.error).toBe('server exploded'))
    expect(result.current.loading).toBe(false)
  })
})
