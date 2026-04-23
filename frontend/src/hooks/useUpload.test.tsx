import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { UploadProvider } from '@/context/UploadContext'

const classifyMock = vi.fn()
vi.mock('@/lib/api', () => ({
  classifyPDF: (file: File) => classifyMock(file),
}))

// Import AFTER vi.mock so the hook picks up the mocked module.
import { useUpload } from './useUpload'

function wrapper({ children }: { children: ReactNode }) {
  return <UploadProvider>{children}</UploadProvider>
}

function makePdf(name: string): File {
  return new File(['%PDF-1.4'], name, { type: 'application/pdf' })
}

describe('useUpload', () => {
  beforeEach(() => {
    classifyMock.mockReset()
  })

  it('transitions idle -> uploading -> done and stores the prediction', async () => {
    classifyMock.mockResolvedValueOnce({
      label: 'permit-3-8',
      probabilities: { 'permit-3-8': 0.9, 'not-permit-3-8': 0.1 },
    })

    const { result } = renderHook(() => useUpload(), { wrapper })

    act(() => {
      result.current.addAndProcess([makePdf('doc.pdf')])
    })

    await waitFor(() => expect(result.current.items[0].status).toBe('done'))

    expect(classifyMock).toHaveBeenCalledTimes(1)
    expect(result.current.items[0].result).toEqual({
      label: 'permit-3-8',
      probabilities: { 'permit-3-8': 0.9, 'not-permit-3-8': 0.1 },
    })
  })

  it('sets status=error with the thrown message when classifyPDF rejects', async () => {
    classifyMock.mockRejectedValueOnce(new Error('network down'))

    const { result } = renderHook(() => useUpload(), { wrapper })

    act(() => {
      result.current.addAndProcess([makePdf('bad.pdf')])
    })

    await waitFor(() => expect(result.current.items[0].status).toBe('error'))
    expect(result.current.items[0].error).toBe('network down')
  })

  it('clear() empties the queue', async () => {
    classifyMock.mockResolvedValue({
      label: 'permit-3-8',
      probabilities: { 'permit-3-8': 0.9, 'not-permit-3-8': 0.1 },
    })

    const { result } = renderHook(() => useUpload(), { wrapper })

    act(() => {
      result.current.addAndProcess([makePdf('a.pdf'), makePdf('b.pdf')])
    })
    await waitFor(() => expect(result.current.items).toHaveLength(2))

    act(() => result.current.clear())
    expect(result.current.items).toHaveLength(0)
  })
})
