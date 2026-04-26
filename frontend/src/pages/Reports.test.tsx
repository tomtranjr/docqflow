import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { StatsResponse } from '@/lib/types'

const getStatsMock = vi.fn()
vi.mock('@/lib/api', () => ({
  getStats: () => getStatsMock(),
}))

import { Reports } from './Reports'

const fakeStats: StatsResponse = {
  total: 42,
  label_counts: { 'permit-3-8': 30, 'not-permit-3-8': 12 },
  recent_count_7d: 9,
}

describe('Reports', () => {
  beforeEach(() => {
    getStatsMock.mockReset()
  })

  it('renders two stat cards from getStats response', async () => {
    getStatsMock.mockResolvedValueOnce(fakeStats)

    render(<Reports />)

    await waitFor(() => expect(screen.getByText('42')).toBeInTheDocument())
    expect(screen.getByText('9')).toBeInTheDocument()
    expect(screen.getByText(/total classified/i)).toBeInTheDocument()
    expect(screen.getByText(/last 7 days/i)).toBeInTheDocument()
  })
})
