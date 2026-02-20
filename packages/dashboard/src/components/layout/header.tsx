'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Menu, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { SidebarNav } from './sidebar-nav'
import { UserNav } from './user-nav'

interface HeaderProps {
  email: string
  name: string
  tier: string
}

export function Header({ email, name, tier }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6">
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={() => setMobileMenuOpen(true)}
        aria-label="Open navigation menu"
      >
        <Menu className="h-5 w-5" aria-hidden="true" />
      </Button>

      {/* Mobile logo */}
      <Link href="/dashboard" className="flex items-center gap-2 font-semibold md:hidden">
        <Shield className="h-5 w-5 text-primary" aria-hidden="true" />
        <span>Sentinel</span>
      </Link>

      {/* Spacer */}
      <div className="flex-1" />

      {/* User navigation */}
      <UserNav email={email} name={name} tier={tier} />

      {/* Mobile sidebar Sheet */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="w-64 p-0">
          <SheetHeader className="h-16 flex-row items-center gap-2 px-6 border-b space-y-0">
            <SheetTitle className="flex items-center gap-2 font-semibold text-base">
              <Shield className="h-5 w-5 text-primary" aria-hidden="true" />
              Sentinel
            </SheetTitle>
          </SheetHeader>
          <div className="py-4">
            <SidebarNav onNavigate={() => setMobileMenuOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>
    </header>
  )
}
