import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { FileText } from 'lucide-react'
import { StatCard } from './StatCard'

describe('StatCard', () => {
  it('renders label and value', () => {
    render(<StatCard icon={<FileText data-testid="icon" />} label="Total Classified" value={42} />)
    expect(screen.getByText('Total Classified')).toBeInTheDocument()
    expect(screen.getByText('42')).toBeInTheDocument()
    expect(screen.getByTestId('icon')).toBeInTheDocument()
  })
})
