'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  Key,
  CreditCard,
  BarChart2,
  FileText,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/accounts', label: 'Accounts', icon: Users },
  { href: '/admin/api-keys', label: 'API Keys', icon: Key },
  { href: '/admin/billing', label: 'Billing', icon: CreditCard },
  { href: '/admin/metrics', label: 'Metrics', icon: BarChart2 },
  { href: '/admin/audit-log', label: 'Audit Log', icon: FileText },
]

interface SidebarNavProps {
  onNavigate?: () => void
}

export function SidebarNav({ onNavigate }: SidebarNavProps) {
  const pathname = usePathname()

  return (
    <nav className="space-y-1 px-3" aria-label="Admin navigation">
      {navItems.map((item) => {
        const Icon = item.icon
        const isActive =
          item.href === '/admin'
            ? pathname === '/admin'
            : pathname.startsWith(item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            )}
            aria-current={isActive ? 'page' : undefined}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
