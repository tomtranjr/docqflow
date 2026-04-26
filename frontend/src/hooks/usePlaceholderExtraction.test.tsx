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
    const r = result.current.result
    expect(r.department).toBe('building')
    expect(r.department_confidence).toBe(0.96)
    expect(r.model).toBe('placeholder')

    const fields = r.fields
    expect(fields.applicant_name).toBeTruthy()
    expect(fields.permit_type).toBeTruthy()

    // Two of the nine fields should be MISSING per the placeholder MISSING
    // patterns; this exercises the MISSING badge path in the UI.
    const missingCount = Object.values(fields).filter((f) => f.value === null).length
    expect(missingCount).toBe(2)
  })

  it('produces different field values for different classification ids', async () => {
    const { result: a } = renderHook(() => usePlaceholderExtraction('id-1'))
    const { result: b } = renderHook(() => usePlaceholderExtraction('id-2'))
    await waitFor(() => {
      expect(a.current.kind).toBe('ok')
      expect(b.current.kind).toBe('ok')
    }, { timeout: 2000 })
    if (a.current.kind !== 'ok' || b.current.kind !== 'ok') throw new Error('expected ok')
    expect(a.current.result.fields.applicant_name.value).not.toBe(
      b.current.result.fields.applicant_name.value,
    )
  })
})
