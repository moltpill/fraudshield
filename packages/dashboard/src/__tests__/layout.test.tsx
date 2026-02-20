import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => '/dashboard'),
  useRouter: vi.fn(() => ({ push: vi.fn(), replace: vi.fn() })),
}))

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
}))

// Mock next-themes
vi.mock('next-themes', () => ({
  useTheme: vi.fn(() => ({ theme: 'light', setTheme: vi.fn() })),
  ThemeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

// Mock next-auth/react
vi.mock('next-auth/react', () => ({
  signOut: vi.fn(),
}))

// Mock UI components that use Radix (avoid portal issues in tests)
vi.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <div role="menuitem" onClick={onClick}>{children}</div>
  ),
  DropdownMenuLabel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuSeparator: () => <hr />,
}))

vi.mock('@/components/ui/sheet', () => ({
  Sheet: ({ children, open }: { children: React.ReactNode; open?: boolean }) => (
    open ? <div data-testid="mobile-sheet">{children}</div> : <div>{children}</div>
  ),
  SheetTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}))

vi.mock('@/components/ui/avatar', () => ({
  Avatar: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AvatarFallback: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}))

import { SidebarNav } from '@/components/layout/sidebar-nav'
import { UserNav } from '@/components/layout/user-nav'
import { Header } from '@/components/layout/header'

describe('SidebarNav', () => {
  it('renders all 5 nav items', () => {
    render(<SidebarNav />)
    expect(screen.getByText('Overview')).toBeInTheDocument()
    expect(screen.getByText('Visitors')).toBeInTheDocument()
    expect(screen.getByText('API Keys')).toBeInTheDocument()
    expect(screen.getByText('Usage')).toBeInTheDocument()
    expect(screen.getByText('Settings')).toBeInTheDocument()
  })

  it('marks overview as active when on /dashboard', () => {
    render(<SidebarNav />)
    const overviewLink = screen.getByText('Overview').closest('a')
    expect(overviewLink).toHaveAttribute('aria-current', 'page')
  })

  it('does not mark other items as active on /dashboard', () => {
    render(<SidebarNav />)
    const visitorsLink = screen.getByText('Visitors').closest('a')
    expect(visitorsLink).not.toHaveAttribute('aria-current', 'page')
  })

  it('renders correct hrefs for nav items', () => {
    render(<SidebarNav />)
    expect(screen.getByText('Overview').closest('a')).toHaveAttribute('href', '/dashboard')
    expect(screen.getByText('Visitors').closest('a')).toHaveAttribute('href', '/dashboard/visitors')
    expect(screen.getByText('API Keys').closest('a')).toHaveAttribute('href', '/dashboard/api-keys')
    expect(screen.getByText('Usage').closest('a')).toHaveAttribute('href', '/dashboard/usage')
    expect(screen.getByText('Settings').closest('a')).toHaveAttribute('href', '/dashboard/settings')
  })

  it('calls onNavigate when a link is clicked', () => {
    const onNavigate = vi.fn()
    render(<SidebarNav onNavigate={onNavigate} />)
    fireEvent.click(screen.getByText('Visitors'))
    expect(onNavigate).toHaveBeenCalledOnce()
  })

  it('marks visitors as active when on /dashboard/visitors', async () => {
    const { usePathname } = await import('next/navigation')
    vi.mocked(usePathname).mockReturnValue('/dashboard/visitors')

    render(<SidebarNav />)
    const visitorsLink = screen.getByText('Visitors').closest('a')
    expect(visitorsLink).toHaveAttribute('aria-current', 'page')

    const overviewLink = screen.getByText('Overview').closest('a')
    expect(overviewLink).not.toHaveAttribute('aria-current', 'page')
  })

  it('has main navigation landmark', () => {
    render(<SidebarNav />)
    expect(screen.getByRole('navigation', { name: 'Main navigation' })).toBeInTheDocument()
  })
})

describe('UserNav', () => {
  const defaultProps = {
    email: 'test@example.com',
    name: 'Test User',
    tier: 'FREE',
  }

  it('renders user initials from full name', () => {
    render(<UserNav {...defaultProps} />)
    expect(screen.getByText('TU')).toBeInTheDocument()
  })

  it('renders initials from email when name is empty', () => {
    render(<UserNav email="hello@example.com" name="" tier="FREE" />)
    expect(screen.getByText('HE')).toBeInTheDocument()
  })

  it('renders user email', () => {
    render(<UserNav {...defaultProps} />)
    expect(screen.getByText('test@example.com')).toBeInTheDocument()
  })

  it('renders user name', () => {
    render(<UserNav {...defaultProps} />)
    expect(screen.getByText('Test User')).toBeInTheDocument()
  })

  it('renders tier badge', () => {
    render(<UserNav {...defaultProps} />)
    expect(screen.getByText('FREE')).toBeInTheDocument()
  })

  it('renders sign out option', () => {
    render(<UserNav {...defaultProps} />)
    expect(screen.getByText('Sign out')).toBeInTheDocument()
  })

  it('renders theme toggle button', () => {
    render(<UserNav {...defaultProps} />)
    expect(screen.getByRole('button', { name: 'Toggle theme' })).toBeInTheDocument()
  })

  it('calls signOut when sign out is clicked', async () => {
    const { signOut } = await import('next-auth/react')
    render(<UserNav {...defaultProps} />)
    fireEvent.click(screen.getByText('Sign out'))
    expect(signOut).toHaveBeenCalledWith({ callbackUrl: '/login' })
  })
})

describe('Header', () => {
  const defaultProps = {
    email: 'user@example.com',
    name: 'Test User',
    tier: 'STARTER',
  }

  it('renders mobile menu button', () => {
    render(<Header {...defaultProps} />)
    expect(screen.getByRole('button', { name: 'Open navigation menu' })).toBeInTheDocument()
  })

  it('renders Eyes brand in mobile header', () => {
    render(<Header {...defaultProps} />)
    const links = screen.getAllByText('Eyes')
    expect(links.length).toBeGreaterThanOrEqual(1)
  })

  it('renders user nav with correct props', () => {
    render(<Header {...defaultProps} />)
    expect(screen.getByText('user@example.com')).toBeInTheDocument()
  })

  it('opens mobile menu sheet when hamburger is clicked', () => {
    render(<Header {...defaultProps} />)
    const menuBtn = screen.getByRole('button', { name: 'Open navigation menu' })
    fireEvent.click(menuBtn)
    expect(screen.getByTestId('mobile-sheet')).toBeInTheDocument()
  })
})
