import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
}))

import { StatCard } from '@/components/dashboard/stat-card'
import { RequestsChart } from '@/components/dashboard/requests-chart'
import { RecentVisitors } from '@/components/dashboard/recent-visitors'

describe('StatCard', () => {
  it('renders the label', () => {
    render(<StatCard label="Visitors (30d)" value={1234} />)
    expect(screen.getByText('Visitors (30d)')).toBeInTheDocument()
  })

  it('renders numeric value', () => {
    render(<StatCard label="Test" value={42} />)
    expect(screen.getByText('42')).toBeInTheDocument()
  })

  it('renders string value with percent', () => {
    render(<StatCard label="VPN Traffic" value="15%" />)
    expect(screen.getByText('15%')).toBeInTheDocument()
  })

  it('renders description when provided', () => {
    render(<StatCard label="Test" value={0} description="Some description" />)
    expect(screen.getByText('Some description')).toBeInTheDocument()
  })

  it('does not render description when not provided', () => {
    render(<StatCard label="Test" value={0} />)
    expect(screen.queryByText('Some description')).not.toBeInTheDocument()
  })
})

describe('RequestsChart', () => {
  const mockData = [
    { date: '2026-02-14', count: 10 },
    { date: '2026-02-15', count: 25 },
    { date: '2026-02-16', count: 15 },
    { date: '2026-02-17', count: 30 },
    { date: '2026-02-18', count: 20 },
    { date: '2026-02-19', count: 45 },
    { date: '2026-02-20', count: 35 },
  ]

  it('renders SVG chart with role img', () => {
    render(<RequestsChart data={mockData} />)
    expect(screen.getByRole('img', { name: /requests over last 7 days/i })).toBeInTheDocument()
  })

  it('renders chart title', () => {
    render(<RequestsChart data={mockData} />)
    expect(screen.getByText('Requests (last 7 days)')).toBeInTheDocument()
  })

  it('renders date labels for each data point', () => {
    render(<RequestsChart data={mockData} />)
    // Should have 7 date labels
    expect(screen.getByText('Feb 14')).toBeInTheDocument()
    expect(screen.getByText('Feb 20')).toBeInTheDocument()
  })

  it('renders with empty data without error', () => {
    const emptyData = Array.from({ length: 7 }, (_, i) => ({
      date: `2026-02-${14 + i}`,
      count: 0,
    }))
    expect(() => render(<RequestsChart data={emptyData} />)).not.toThrow()
  })
})

describe('RecentVisitors', () => {
  const mockVisitors = [
    {
      id: 'abc123def456ghi789',
      firstSeen: new Date('2026-02-01T10:00:00Z'),
      lastSeen: new Date('2026-02-20T14:30:00Z'),
      visitCount: 5,
    },
    {
      id: 'xyz987uvw654rst321',
      firstSeen: new Date('2026-02-10T08:00:00Z'),
      lastSeen: new Date('2026-02-19T16:45:00Z'),
      visitCount: 2,
    },
  ]

  it('renders visitor rows', () => {
    render(<RecentVisitors visitors={mockVisitors} />)
    expect(screen.getByText('abc123def456...')).toBeInTheDocument()
    expect(screen.getByText('xyz987uvw654...')).toBeInTheDocument()
  })

  it('renders visit counts', () => {
    render(<RecentVisitors visitors={mockVisitors} />)
    expect(screen.getByText('5')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('renders visitor links to detail page', () => {
    render(<RecentVisitors visitors={mockVisitors} />)
    const link = screen.getByText('abc123def456...').closest('a')
    expect(link).toHaveAttribute('href', '/dashboard/visitors/abc123def456ghi789')
  })

  it('shows empty state when no visitors', () => {
    render(<RecentVisitors visitors={[]} />)
    expect(screen.getByText(/no visitors yet/i)).toBeInTheDocument()
  })

  it('renders table with correct columns', () => {
    render(<RecentVisitors visitors={mockVisitors} />)
    expect(screen.getByText('Visitor ID')).toBeInTheDocument()
    expect(screen.getByText('Last Seen')).toBeInTheDocument()
    expect(screen.getByText('Visits')).toBeInTheDocument()
  })
})
