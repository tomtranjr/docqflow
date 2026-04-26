import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { About } from './About'

describe('About', () => {
  it('renders the About header without crashing', () => {
    render(<About />)
    expect(screen.getByRole('heading', { name: /about docqflow/i })).toBeInTheDocument()
  })
})
