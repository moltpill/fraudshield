import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => '/admin'),
  useRouter: vi.fn(() => ({ push: vi.fn(), refresh: vi.fn() })),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}))

// Mock next-auth/react
vi.mock('next-auth/react', () => ({
  signOut: vi.fn(),
}))

// Mock Radix UI portal components
vi.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({ children, onSelect }: { children: React.ReactNode; onSelect?: () => void }) => (
    <div onClick={onSelect}>{children}</div>
  ),
  DropdownMenuLabel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuSeparator: () => <hr />,
}))

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open?: boolean }) =>
    open ? <div role="dialog">{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

describe('SidebarNav', () => {
  it('renders all navigation items', async () => {
    const { SidebarNav } = await import('@/components/layout/sidebar-nav')
    render(<SidebarNav />)
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Accounts')).toBeInTheDocument()
    expect(screen.getByText('API Keys')).toBeInTheDocument()
    expect(screen.getByText('Billing')).toBeInTheDocument()
    expect(screen.getByText('Metrics')).toBeInTheDocument()
    expect(screen.getByText('Audit Log')).toBeInTheDocument()
  })

  it('highlights current path as active', async () => {
    const { usePathname } = await import('next/navigation')
    ;(usePathname as ReturnType<typeof vi.fn>).mockReturnValue('/admin/accounts')
    const { SidebarNav } = await import('@/components/layout/sidebar-nav')
    render(<SidebarNav />)
    const accountsLink = screen.getByText('Accounts').closest('a')
    expect(accountsLink).toHaveClass('bg-primary')
  })

  it('has correct hrefs for all nav items', async () => {
    const { SidebarNav } = await import('@/components/layout/sidebar-nav')
    render(<SidebarNav />)
    const links = screen.getAllByRole('link')
    const hrefs = links.map((l) => l.getAttribute('href'))
    expect(hrefs).toContain('/admin')
    expect(hrefs).toContain('/admin/accounts')
    expect(hrefs).toContain('/admin/api-keys')
    expect(hrefs).toContain('/admin/audit-log')
  })
})

describe('UserNav', () => {
  it('renders user initials', async () => {
    const { UserNav } = await import('@/components/layout/user-nav')
    render(<UserNav email="admin@test.com" name="Admin User" role="SUPER_ADMIN" />)
    expect(screen.getByText('AU')).toBeInTheDocument()
  })

  it('shows role badge', async () => {
    const { UserNav } = await import('@/components/layout/user-nav')
    render(<UserNav email="admin@test.com" name="Admin" role="SUPPORT" />)
    expect(screen.getByText('SUPPORT')).toBeInTheDocument()
  })

  it('shows email in dropdown', async () => {
    const { UserNav } = await import('@/components/layout/user-nav')
    render(<UserNav email="admin@example.com" name="Admin" role="READONLY" />)
    expect(screen.getByText('admin@example.com')).toBeInTheDocument()
  })
})

describe('AdminHeader', () => {
  it('renders user nav', async () => {
    const { AdminHeader } = await import('@/components/layout/header')
    render(<AdminHeader email="admin@test.com" name="Test Admin" role="SUPER_ADMIN" />)
    expect(screen.getByText('TA')).toBeInTheDocument()
  })

  it('shows breadcrumb when provided', async () => {
    const { AdminHeader } = await import('@/components/layout/header')
    render(<AdminHeader email="admin@test.com" name="Test" role="SUPER_ADMIN" breadcrumb="Accounts" />)
    expect(screen.getByText('Accounts')).toBeInTheDocument()
  })

  it('shows mobile menu button', async () => {
    const { AdminHeader } = await import('@/components/layout/header')
    render(<AdminHeader email="admin@test.com" name="Test" role="SUPER_ADMIN" />)
    expect(screen.getByLabelText('Open navigation menu')).toBeInTheDocument()
  })

  it('opens mobile menu on hamburger click', async () => {
    const user = userEvent.setup()
    const { AdminHeader } = await import('@/components/layout/header')
    render(<AdminHeader email="admin@test.com" name="Test" role="SUPER_ADMIN" />)
    await user.click(screen.getByLabelText('Open navigation menu'))
    expect(screen.getByText('Admin Panel')).toBeInTheDocument()
  })
})
