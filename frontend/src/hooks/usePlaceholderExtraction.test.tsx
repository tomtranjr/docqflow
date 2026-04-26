import { renderHook, waitFor } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { usePlaceholderExtraction } from './usePlaceholderExtraction'

describe('usePlaceholderExtraction', () => {
  it('starts in loading and resolves to ok with the expected shape', async () => {
    const { result } = renderHook(() => usePlaceholderExtraction('abc'))
    expect(result.current.kind).toBe('loading')
    await waitFor(
      () => {
        expect(result.current.kind).toBe('ok')
      },
      { timeout: 2000 },
    )
    if (result.current.kind !== 'ok') throw new Error('expected ok state')
    const { result: r } = { result: result.current.result }
    expect(r.department).toBe('building')
    expect(r.department_confidence).toBe(0.96)
    expect(r.model).toBe('placeholder')
    expect(r.fields.applicant_name.value).toBe('John Doe')
    expect(r.fields.estimated_cost.value).toBeNull()
  })
})
