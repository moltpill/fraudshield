import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import { getRiskLevel } from '@/lib/visitors-data'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => '/dashboard/visitors'),
  useRouter: vi.fn(() => ({ push: vi.fn() })),
  useSearchParams: vi.fn(() => ({ get: vi.fn(() => null), toString: vi.fn(() => '') })),
}))

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
}))

// Mock Badge and Button
vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant }: { children: React.ReactNode; variant?: string }) => (
    <span data-variant={variant}>{children}</span>
  ),
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, ...props }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; [key: string]: unknown }) => (
    <button onClick={onClick} disabled={disabled} {...props}>{children}</button>
  ),
}))

vi.mock('@/components/ui/input', () => ({
  Input: ({ onChange, ...props }: { onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void; [key: string]: unknown }) => (
    <input onChange={onChange} {...props} />
  ),
}))

vi.mock('@/components/ui/select', () => ({
  Select: ({ children, onValueChange }: { children: React.ReactNode; onValueChange?: (v: string) => void }) => (
    <div data-testid="select" onClick={() => onValueChange?.('high')}>{children}</div>
  ),
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <div data-value={value}>{children}</div>
  ),
}))

describe('getRiskLevel', () => {
  it('returns high for score >= 70', () => {
    expect(getRiskLevel(70)).toBe('high')
    expect(getRiskLevel(100)).toBe('high')
    expect(getRiskLevel(85)).toBe('high')
  })

  it('returns medium for score 30-69', () => {
    expect(getRiskLevel(30)).toBe('medium')
    expect(getRiskLevel(50)).toBe('medium')
    expect(getRiskLevel(69)).toBe('medium')
  })

  it('returns low for score < 30', () => {
    expect(getRiskLevel(0)).toBe('low')
    expect(getRiskLevel(15)).toBe('low')
    expect(getRiskLevel(29)).toBe('low')
  })
})

import { Pagination } from '@/components/visitors/pagination'

describe('Pagination', () => {
  it('renders page info', () => {
    render(<Pagination currentPage={2} totalPages={5} />)
    expect(screen.getByText('Page 2 of 5')).toBeInTheDocument()
  })

  it('disables Prev button on page 1', () => {
    render(<Pagination currentPage={1} totalPages={3} />)
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled()
  })

  it('disables Next button on last page', () => {
    render(<Pagination currentPage={3} totalPages={3} />)
    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled()
  })

  it('enables both buttons on middle page', () => {
    render(<Pagination currentPage={2} totalPages={5} />)
    expect(screen.getByRole('button', { name: 'Previous page' })).not.toBeDisabled()
    expect(screen.getByRole('button', { name: 'Next page' })).not.toBeDisabled()
  })

  it('returns null when only 1 page', () => {
    const { container } = render(<Pagination currentPage={1} totalPages={1} />)
    expect(container.firstChild).toBeNull()
  })
})
