import Link from 'next/link'
import { ShieldAlert } from 'lucide-react'
import { SidebarNav } from './sidebar-nav'

export function AdminSidebar() {
  return (
    <aside className="hidden md:flex md:flex-col md:w-64 md:fixed md:inset-y-0 border-r bg-background">
      <div className="flex h-16 items-center gap-2 px-6 border-b shrink-0">
        <Link href="/admin" className="flex items-center gap-2 font-semibold">
          <ShieldAlert className="h-5 w-5 text-primary" aria-hidden="true" />
          <span>FraudShield</span>
          <span className="text-xs text-primary font-bold bg-primary/10 px-1.5 py-0.5 rounded">ADMIN</span>
        </Link>
      </div>
      <div className="flex-1 overflow-y-auto py-4">
        <SidebarNav />
      </div>
    </aside>
  )
}
