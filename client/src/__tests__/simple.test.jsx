import { render, screen } from '@testing-library/react'
import { describe, test, expect } from 'vitest'

describe('Simple Test', () => {
  test('renders simple content', () => {
    render(<div>Hello World</div>)
    const element = screen.getByText('Hello World')
    expect(element).toBeInTheDocument()
  })
})