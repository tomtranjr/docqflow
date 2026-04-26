import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { Landing } from './Landing'

function setup() {
  return render(
    <MemoryRouter>
      <Landing />
    </MemoryRouter>,
  )
}

describe('Landing', () => {
  it('renders the DocQFlow logo with slogan', () => {
    setup()
    const img = screen.getByAltText(/docqflow/i) as HTMLImageElement
    expect(img.getAttribute('src')).toBe('/docqflow-logo-with-slogan.svg')
  })

  it('renders four marketing tile headings', () => {
    setup()
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(4)
  })

  it('renders a Sign-in CTA pointing at /login', () => {
    setup()
    const link = screen.getByRole('link', { name: /sign in/i })
    expect(link).toHaveAttribute('href', '/login')
  })
})
