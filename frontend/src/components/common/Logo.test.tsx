import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { Logo } from './Logo'

describe('Logo', () => {
  it('renders an image with docqflow alt text', () => {
    render(<Logo size="sm" />)
    expect(screen.getByAltText(/docqflow/i)).toBeInTheDocument()
  })

  it('uses /docqflow-logo.svg by default', () => {
    render(<Logo size="sm" />)
    const img = screen.getByAltText(/docqflow/i) as HTMLImageElement
    expect(img.getAttribute('src')).toBe('/docqflow-logo.svg')
  })

  it('uses the slogan SVG when withSlogan is true', () => {
    render(<Logo size="sm" withSlogan />)
    const img = screen.getByAltText(/docqflow/i) as HTMLImageElement
    expect(img.getAttribute('src')).toBe('/docqflow-logo-with-slogan.svg')
  })

  it('applies h-6 for size="sm"', () => {
    render(<Logo size="sm" />)
    const img = screen.getByAltText(/docqflow/i)
    expect(img.className).toContain('h-6')
  })

  it('applies h-8 for size="md"', () => {
    render(<Logo size="md" />)
    const img = screen.getByAltText(/docqflow/i)
    expect(img.className).toContain('h-8')
  })

  it('applies h-12 for size="lg"', () => {
    render(<Logo size="lg" />)
    const img = screen.getByAltText(/docqflow/i)
    expect(img.className).toContain('h-12')
  })
})
