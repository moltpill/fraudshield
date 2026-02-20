'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Menu, ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SidebarNav } from './sidebar-nav'
import { UserNav } from './user-nav'

interface AdminHeaderProps {
  email: string
  name: string
  role: string
  breadcrumb?: string
}

export function AdminHeader({ email, name, role, breadcrumb }: AdminHeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6">
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        aria-label="Open navigation menu"
      >
        <Menu className="h-5 w-5" aria-hidden="true" />
      </Button>

      {/* Mobile logo */}
      <Link href="/admin" className="flex items-center gap-2 font-semibold md:hidden">
        <ShieldAlert className="h-5 w-5 text-primary" aria-hidden="true" />
        <span>Admin</span>
      </Link>

      {/* Breadcrumb */}
      {breadcrumb && (
        <div className="hidden md:flex items-center text-sm text-muted-foreground">
          <Link href="/admin" className="hover:text-foreground transition-colors">
            Admin
          </Link>
          <span className="mx-2">/</span>
          <span className="text-foreground font-medium">{breadcrumb}</span>
        </div>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* User navigation */}
      <UserNav email={email} name={name} role={role} />

      {/* Mobile sidebar overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="fixed inset-0 bg-background/80 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="fixed left-0 top-0 h-full w-64 bg-background border-r shadow-lg">
            <div className="flex h-16 items-center gap-2 px-6 border-b">
              <ShieldAlert className="h-5 w-5 text-primary" aria-hidden="true" />
              <span className="font-semibold">Admin Panel</span>
            </div>
            <div className="py-4">
              <SidebarNav onNavigate={() => setMobileMenuOpen(false)} />
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
