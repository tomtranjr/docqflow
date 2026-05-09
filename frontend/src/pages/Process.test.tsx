import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { LLMProfileInfo, PipelineResult } from '@/lib/types'

const processMock = vi.fn<(file: File, profile: string) => Promise<PipelineResult>>()
const profilesMock = vi.fn<() => Promise<LLMProfileInfo[]>>()
vi.mock('@/lib/api', () => ({
  processPDF: (file: File, profile: string) => processMock(file, profile),
  getLLMProfiles: () => profilesMock(),
}))

import { Process } from './Process'

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

function makePdf(name: string): File {
  return new File(['%PDF-1.4'], name, { type: 'application/pdf' })
}

const SAMPLE_RESULT: PipelineResult = {
  document_id: '11111111-2222-3333-4444-555555555555',
  llm_profile: 'cloud-fast',
  verdict: 'major',
  extracted_fields: {
    '2A ESTIMATED COST OF JOB': '$5,000',
    'Check Box8': true,
    '16 DESCRIPTION': null,
  },
  issues: [
    {
      kind: 'missing_description',
      severity: 'major',
      field: '16 DESCRIPTION',
      value: null,
      message: 'Description fields are all empty',
      source: 'rule',
      confidence: null,
    },
    {
      kind: 'block_lot_format',
      severity: 'minor',
      field: '4A LOT NO',
      value: '123/45',
      message: 'Block/lot must be 4/3 digits',
      source: 'rule',
      confidence: null,
    },
  ],
  latency_ms: 842,
}

describe('Process', () => {
  beforeEach(() => {
    processMock.mockReset()
    profilesMock.mockReset()
  })

  it('renders the model indicator and a pipeline result for a successful upload', async () => {
    profilesMock.mockResolvedValue([
      { name: 'cloud-fast', provider: 'openai', model: 'gpt-4o-mini', reachable: true },
    ])
    processMock.mockResolvedValue(SAMPLE_RESULT)

    const Wrapper = makeWrapper()
    render(
      <Wrapper>
        <Process />
      </Wrapper>,
    )

    await waitFor(() => expect(screen.getByText('openai/gpt-4o-mini')).toBeInTheDocument())
    expect(screen.getByLabelText(/active llm profile/i)).toHaveTextContent('cloud-fast')
    expect(screen.getByLabelText(/profile reachable/i)).toBeInTheDocument()

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    expect(fileInput).not.toBeNull()
    await act(async () => {
      await userEvent.upload(fileInput, makePdf('permit.pdf'))
    })

    const verdict = await screen.findByRole('status', { name: /verdict: major issues/i })
    expect(verdict).toHaveAttribute('data-verdict', 'major')
    expect(screen.getByText('missing_description')).toBeInTheDocument()
    expect(screen.getByText('block_lot_format')).toBeInTheDocument()
    expect(screen.getByText(/major \(1\)/i)).toBeInTheDocument()
    expect(screen.getByText(/minor \(1\)/i)).toBeInTheDocument()

    expect(processMock).toHaveBeenCalledTimes(1)
    expect(processMock.mock.calls[0][1]).toBe('cloud-fast')
  })

  it('surfaces server error detail when processPDF rejects', async () => {
    profilesMock.mockResolvedValue([
      { name: 'cloud-fast', provider: 'openai', model: 'gpt-4o-mini', reachable: true },
    ])
    processMock.mockRejectedValue(new Error('PDF is not an AcroForm (likely scanned or flattened)'))

    const Wrapper = makeWrapper()
    render(
      <Wrapper>
        <Process />
      </Wrapper>,
    )

    await waitFor(() => expect(screen.getByText('openai/gpt-4o-mini')).toBeInTheDocument())

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    await act(async () => {
      await userEvent.upload(fileInput, makePdf('flat.pdf'))
    })

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(/flat\.pdf/)
    expect(alert).toHaveTextContent(/not an acroform/i)
  })
})
