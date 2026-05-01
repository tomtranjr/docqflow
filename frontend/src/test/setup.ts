import '@testing-library/jest-dom/vitest'
import { afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

if (typeof globalThis.crypto === 'undefined') {
  ;(globalThis as { crypto?: Crypto }).crypto = {} as Crypto
}
if (typeof globalThis.crypto.randomUUID === 'undefined') {
  let counter = 0
  globalThis.crypto.randomUUID = (() =>
    `test-uuid-${++counter}` as `${string}-${string}-${string}-${string}-${string}`)
}

if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }))
}

afterEach(() => {
  cleanup()
})
