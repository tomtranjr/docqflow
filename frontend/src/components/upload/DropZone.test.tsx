import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DropZone } from './DropZone'
import { MAX_FILE_SIZE } from '@/lib/constants'

function makeFile(name: string, type: string, size: number): File {
  const file = new File(['x'], name, { type })
  // override size with a property descriptor (File.size is read-only by default)
  Object.defineProperty(file, 'size', { value: size, configurable: true })
  return file
}

describe('DropZone', () => {
  it('accepts a valid PDF and calls onFiles', () => {
    const onFiles = vi.fn()
    render(<DropZone onFiles={onFiles} />)

    const input = document.querySelector('input[type=file]') as HTMLInputElement
    const pdf = makeFile('doc.pdf', 'application/pdf', 1024)
    fireEvent.change(input, { target: { files: [pdf] } })

    expect(onFiles).toHaveBeenCalledTimes(1)
    expect(onFiles.mock.calls[0][0]).toEqual([pdf])
  })

  it('rejects a non-PDF by extension and MIME type', () => {
    const onFiles = vi.fn()
    render(<DropZone onFiles={onFiles} />)

    const input = document.querySelector('input[type=file]') as HTMLInputElement
    const txt = makeFile('notes.txt', 'text/plain', 1024)
    fireEvent.change(input, { target: { files: [txt] } })

    expect(onFiles).not.toHaveBeenCalled()
    expect(screen.getByText(/only pdf files accepted/i)).toBeInTheDocument()
  })

  it('rejects a PDF that exceeds the 20MB size limit', () => {
    const onFiles = vi.fn()
    render(<DropZone onFiles={onFiles} />)

    const input = document.querySelector('input[type=file]') as HTMLInputElement
    const huge = makeFile('huge.pdf', 'application/pdf', MAX_FILE_SIZE + 1)
    fireEvent.change(input, { target: { files: [huge] } })

    expect(onFiles).not.toHaveBeenCalled()
    expect(screen.getByText(/exceeds 20mb/i)).toBeInTheDocument()
  })
})
