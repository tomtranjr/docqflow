import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { NotificationsProvider, useNotifications } from '@/context/NotificationsContext'
import { UploadProvider, useUploadContext } from '@/context/UploadContext'

const classifyMock = vi.fn()
const fieldsMock = vi.fn()
vi.mock('@/lib/api', () => ({
  classifyPDF: (file: File) => classifyMock(file),
  getClassificationFields: (id: number) => fieldsMock(id),
}))

const navigateMock = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useNavigate: () => navigateMock,
  }
})

// Import AFTER vi.mock so the hook picks up the mocked module.
import { useUpload } from './useUpload'

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <NotificationsProvider>
          <MemoryRouter>
            <UploadProvider>{children}</UploadProvider>
          </MemoryRouter>
        </NotificationsProvider>
      </QueryClientProvider>
    )
  }
}

const wrapper = makeWrapper()

function makePdf(name: string): File {
  return new File(['%PDF-1.4'], name, { type: 'application/pdf' })
}

describe('useUpload', () => {
  beforeEach(() => {
    classifyMock.mockReset()
    navigateMock.mockReset()
    fieldsMock.mockReset()
    localStorage.clear()
  })

  it('1-file upload classifies and navigates to /app/review/:id', async () => {
    classifyMock.mockResolvedValueOnce({
      id: 7,
      label: 'permit-3-8',
      probabilities: { 'permit-3-8': 0.9, 'not-permit-3-8': 0.1 },
      pdf_sha256: 'abc',
    })

    const { result } = renderHook(() => useUpload(), { wrapper })

    await act(async () => {
      await result.current.addAndProcess([makePdf('one.pdf')])
    })

    expect(classifyMock).toHaveBeenCalledTimes(1)
    expect(navigateMock).toHaveBeenCalledWith('/app/review/7')
  })

  it('N-file upload populates queueResults and navigates to /app/queue', async () => {
    classifyMock
      .mockResolvedValueOnce({
        id: 1,
        label: 'permit-3-8',
        probabilities: { 'permit-3-8': 0.9, 'not-permit-3-8': 0.1 },
        pdf_sha256: 'a',
      })
      .mockResolvedValueOnce({
        id: 2,
        label: 'not-permit-3-8',
        probabilities: { 'permit-3-8': 0.2, 'not-permit-3-8': 0.8 },
        pdf_sha256: 'b',
      })

    const { result } = renderHook(
      () => {
        const upload = useUpload()
        const ctx = useUploadContext()
        return { upload, ctx }
      },
      { wrapper },
    )

    await act(async () => {
      await result.current.upload.addAndProcess([makePdf('a.pdf'), makePdf('b.pdf')])
    })

    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith('/app/queue'))
    expect(classifyMock).toHaveBeenCalledTimes(2)
    expect(result.current.ctx.queueResults).toHaveLength(2)
    expect(result.current.ctx.queueResults[0].filename).toBe('a.pdf')
    expect(result.current.ctx.queueResults[1].filename).toBe('b.pdf')
  })

  it('does not navigate when classifyPDF rejects on a single-file upload', async () => {
    classifyMock.mockRejectedValueOnce(new Error('network down'))

    const { result } = renderHook(() => useUpload(), { wrapper })

    await act(async () => {
      await result.current.addAndProcess([makePdf('bad.pdf')])
    })

    expect(navigateMock).not.toHaveBeenCalled()
  })

  it('pushes a pass notification when permit-3-8 fields are complete', async () => {
    classifyMock.mockResolvedValueOnce({
      id: 11,
      label: 'permit-3-8',
      probabilities: { 'permit-3-8': 0.95, 'not-permit-3-8': 0.05 },
      pdf_sha256: 'a',
    })
    fieldsMock.mockResolvedValueOnce({
      fields: { application_number: '202604089128' },
      completeness: { passed: true, missing: [] },
    })

    const seedWrapper = makeWrapper()
    const { result } = renderHook(
      () => ({ upload: useUpload(), notifications: useNotifications() }),
      { wrapper: seedWrapper },
    )

    await act(async () => {
      await result.current.upload.addAndProcess([makePdf('permit.pdf')])
    })

    await waitFor(() => expect(result.current.notifications.notifications).toHaveLength(1))
    expect(result.current.notifications.notifications[0]).toMatchObject({
      kind: 'pass',
      classificationId: 11,
      filename: 'permit.pdf',
    })
  })

  it('does not push a notification when label is not-permit-3-8', async () => {
    classifyMock.mockResolvedValueOnce({
      id: 22,
      label: 'not-permit-3-8',
      probabilities: { 'permit-3-8': 0.1, 'not-permit-3-8': 0.9 },
      pdf_sha256: 'b',
    })

    const seedWrapper = makeWrapper()
    const { result } = renderHook(
      () => ({ upload: useUpload(), notifications: useNotifications() }),
      { wrapper: seedWrapper },
    )

    await act(async () => {
      await result.current.upload.addAndProcess([makePdf('homework.pdf')])
    })

    expect(fieldsMock).not.toHaveBeenCalled()
    expect(result.current.notifications.notifications).toHaveLength(0)
  })

  it('pushes a fail notification with missing-field summary when completeness fails', async () => {
    classifyMock.mockResolvedValueOnce({
      id: 33,
      label: 'permit-3-8',
      probabilities: { 'permit-3-8': 0.88, 'not-permit-3-8': 0.12 },
      pdf_sha256: 'c',
    })
    fieldsMock.mockResolvedValueOnce({
      fields: { application_number: null },
      completeness: { passed: false, missing: ['application_number', 'estimated_cost'] },
    })

    const seedWrapper = makeWrapper()
    const { result } = renderHook(
      () => ({ upload: useUpload(), notifications: useNotifications() }),
      { wrapper: seedWrapper },
    )

    await act(async () => {
      await result.current.upload.addAndProcess([makePdf('blank.pdf')])
    })

    await waitFor(() => expect(result.current.notifications.notifications).toHaveLength(1))
    expect(result.current.notifications.notifications[0]).toMatchObject({
      kind: 'fail',
      classificationId: 33,
      message: 'Missing 2 required fields',
    })
  })
})
