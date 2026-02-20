import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
}))

vi.mock('lucide-react', () => ({
  CheckCircle2: () => <span data-testid="check-icon" />,
  XCircle: () => <span data-testid="x-icon" />,
  Clock: () => <span data-testid="clock-icon" />,
  AlertCircle: () => <span data-testid="alert-icon" />,
  CreditCard: () => <span data-testid="credit-card-icon" />,
}))

import { PLAN_DETAILS } from '@/lib/billing-data'
import { UpgradeButton, CancelButton } from '@/components/billing/upgrade-button'

describe('PLAN_DETAILS', () => {
  it('has 5 plans', () => {
    expect(PLAN_DETAILS).toHaveLength(5)
  })

  it('FREE plan has R0/mo pricing', () => {
    const free = PLAN_DETAILS.find(p => p.tier === 'FREE')
    expect(free?.priceLabel).toBe('R0/mo')
    expect(free?.price).toBe(0)
  })

  it('STARTER plan has R149/mo pricing', () => {
    const starter = PLAN_DETAILS.find(p => p.tier === 'STARTER')
    expect(starter?.priceLabel).toBe('R149/mo')
    expect(starter?.price).toBe(14900)
  })

  it('GROWTH plan has R399/mo pricing', () => {
    const growth = PLAN_DETAILS.find(p => p.tier === 'GROWTH')
    expect(growth?.priceLabel).toBe('R399/mo')
    expect(growth?.price).toBe(39900)
  })

  it('SCALE plan has R999/mo pricing', () => {
    const scale = PLAN_DETAILS.find(p => p.tier === 'SCALE')
    expect(scale?.priceLabel).toBe('R999/mo')
    expect(scale?.price).toBe(99900)
  })

  it('ENTERPRISE plan has Custom pricing', () => {
    const enterprise = PLAN_DETAILS.find(p => p.tier === 'ENTERPRISE')
    expect(enterprise?.priceLabel).toBe('Custom')
  })

  it('each plan has features listed', () => {
    PLAN_DETAILS.forEach(plan => {
      expect(plan.features.length).toBeGreaterThan(0)
    })
  })
})

describe('UpgradeButton', () => {
  it('renders upgrade button with tier label', () => {
    render(<UpgradeButton tier="STARTER" label="Upgrade to Starter" />)
    expect(screen.getByRole('button', { name: /upgrade to starter/i })).toBeInTheDocument()
  })

  it('is disabled when disabled prop is true', () => {
    render(<UpgradeButton tier="STARTER" label="Upgrade to Starter" disabled />)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('renders in outline variant', () => {
    render(<UpgradeButton tier="GROWTH" label="Upgrade to Growth" variant="outline" />)
    expect(screen.getByRole('button')).toBeInTheDocument()
  })
})

describe('CancelButton', () => {
  it('renders cancel button', () => {
    render(<CancelButton />)
    expect(screen.getByRole('button', { name: /cancel subscription/i })).toBeInTheDocument()
  })

  it('shows confirmation text on first click', () => {
    render(<CancelButton />)
    const btn = screen.getByRole('button', { name: /cancel subscription/i })
    fireEvent.click(btn)
    expect(screen.getByText(/click again to confirm/i)).toBeInTheDocument()
  })
})
